/* global fetch */
const Product = require('../models/Product');

/**
 * Handle POST /api/ai/recommend-stack
 */
exports.recommendStack = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide a fitness goal or preference.' });
    }

    if (query.length > 500) {
      return res.status(400).json({ success: false, message: 'Query too long. Please keep it under 500 characters.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'AI configuration is missing on the server.' });
    }

    // 1. Fetch available products
    const products = await Product.find({}).lean();

    // 2. Format catalog for LLM
    const catalog = products.map(p => {
      // Map variants to extract available flavors and sizes
      const availableVariants = (p.variants || [])
        .filter(v => (v.availableStock || 0) > 0)
        .map(v => ({ flavor: v.flavor, size: v.weight }));

      // Also include flavors and sizes from legacy arrays if variants are missing
      let flavors = p.flavors?.filter(f => f.inStock !== false).map(f => f.name) || [];
      let sizes = p.sizes?.filter(s => s.inStock !== false).map(s => s.weight) || [];

      let stackGroup = 'none';
      const stackMatch = p.description?.match(/<!--\[STACK:(.*?)\]-->/);
      if (stackMatch) stackGroup = stackMatch[1];
      
      // Auto-detect groups based on names/categories (mimicking frontend logic)
      if (stackGroup === 'none') {
        const nameLower = p.name.toLowerCase();
        const cat = (p.subCategory || '').toLowerCase();
        if (cat === 'creatine' || nameLower.includes('creatine')) {
          stackGroup = 'boost';
        } else if (
          ['whey protein', 'mass gainer', 'iso plasma', 'weight gainer', 'protein blend', 'isolate'].includes(cat) ||
          nameLower.includes('hydra') || nameLower.includes('iso plasma') || nameLower.includes('mass') || nameLower.includes('whey')
        ) {
          stackGroup = 'core';
        }
      }

      return {
        id: p._id,
        name: p.name,
        stackGroup: stackGroup,
        availableVariants: availableVariants.length > 0 ? availableVariants : { flavors, sizes }
      };
    }).filter(p => p.stackGroup !== 'none');

    // 3. Construct System Prompt
    const systemPrompt = `You are an elite sports nutritionist and supplement formulator for Living Result.
Your task is to analyze the user's fitness goal and recommend the optimal supplement stack (1 Core product + 1 Boost product) from the available catalog.
The user query is: "${query}"

Available Catalog:
${JSON.stringify(catalog, null, 2)}

Rules:
1. "Core" products have stackGroup="core". "Boost" products have stackGroup="boost".
2. If the user mentions "lactose intolerant", "lactose-free", "zero lactose", or "vegan", prefer isolates/iso plasma. If "bulk" or "weight gain", prefer Mass Gainer.
3. You must select EXACTLY ONE Core product and EXACTLY ONE Boost product from the catalog provided.
4. For each selected product, pick a flavor and size from its availableVariants or flavors/sizes array. If availableVariants array is provided, select a flavor and size that appear together in one of the objects. If none, output empty strings or "Regular".
5. Provide a personalized rationale (2-3 sentences) explaining why this stack fits their specific query.
6. Calculate a "matchScore" (0-100) indicating how perfectly this stack matches their goals.
7. Return ONLY valid JSON matching this schema:
{
  "recommendedCoreId": "MongoDB ID string",
  "recommendedCoreFlavor": "Flavor name string",
  "recommendedCoreSize": "Size string",
  "recommendedBoostId": "MongoDB ID string",
  "recommendedBoostFlavor": "Flavor name string",
  "recommendedBoostSize": "Size string",
  "matchScore": number,
  "rationale": "Explanation"
}`;

    // 4. Call Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', errorText);
      return res.status(502).json({ success: false, message: 'AI service is temporarily unavailable.' });
    }

    const aiData = await response.json();
    const resultText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!resultText) {
      return res.status(500).json({ success: false, message: 'Invalid response from AI model.' });
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(resultText);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ success: false, message: 'Failed to parse AI recommendation.' });
    }

    res.status(200).json({
      success: true,
      data: parsedResult
    });

  } catch (error) {
    console.error('AI Recommend Stack Error:', error);
    res.status(500).json({ success: false, message: 'Server error processing AI request.' });
  }
};
