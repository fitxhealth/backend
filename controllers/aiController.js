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

/**
 * Handle POST /api/ai/chat-recommend
 * Recommends individual products based on user's natural language query.
 * Returns a conversational response + structured product recommendations.
 * If the goal is best served by a combo/stack, sets suggestStackLab=true.
 */
exports.chatRecommend = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Please describe your fitness goal.' });
    }
    if (query.length > 500) {
      return res.status(400).json({ success: false, message: 'Query too long. Please keep it under 500 characters.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'AI configuration is missing on the server.' });
    }

    // 1. Fetch all available products
    const products = await Product.find({ category: { $in: ['common', 'unique'] } }).lean();

    // 2. Build a compact catalog for the AI prompt
    const catalog = products.map(p => {
      const inStockFlavors = (p.flavors || []).filter(f => f.inStock !== false).map(f => f.name);
      const inStockSizes = (p.sizes || []).filter(s => s.inStock !== false).map(s => ({ weight: s.weight, price: s.price }));
      const variantFlavors = [...new Set((p.variants || []).filter(v => (v.availableStock || 0) > 0).map(v => v.flavor))];
      const availableFlavors = variantFlavors.length > 0 ? variantFlavors : inStockFlavors;

      return {
        id: p._id.toString(),
        slug: p.slug,
        name: p.name,
        category: p.category,           // 'unique' or 'common'
        tier: p.category === 'unique' ? 1 : 2,  // 1 = exclusive/high-priority, 2 = standard
        subCategory: p.subCategory || p.category,
        price: p.price,
        isBulking: p.isBulking,
        isMuscle: p.isMuscle,
        isFatLoss: p.isFatLoss,
        availableFlavors: availableFlavors.slice(0, 6),
        sizes: inStockSizes.slice(0, 4)
      };
    });

    // 3. Build the system prompt
    const systemPrompt = `You are an expert sports nutritionist and premium supplement advisor for Living Result — an elite Indian supplement store.
The user has described their fitness goal. Your task is to recommend the best individual products from the catalog below.

User goal: "${query}"

Product Catalog (JSON):
${JSON.stringify(catalog, null, 2)}

PRODUCT TIER RULES (CRITICAL — follow strictly):
- tier=1 products (category="unique") are Living Result's EXCLUSIVE, highest-grade products not found anywhere else. These are your TOP PRIORITY. Always recommend a tier=1 product first if one even remotely fits the user's goal.
- tier=2 products (category="common") are standard/everyday products. Only recommend these as a secondary addition (e.g. second or third recommendation) or if absolutely no tier=1 product fits the goal at all.
- Under no circumstances should a tier=2 product appear before a tier=1 product in the recommendations list.
- If you recommend a tier=1 product, briefly mention in the message that it is an exclusive product only available here — this feels premium and builds trust.

Instructions:
1. Recommend 1 to 3 products from the catalog that best match the user's goal, prioritising tier=1 products as described above.
2. Write a friendly, motivating, conversational message (2-3 sentences) explaining your recommendation. Use "you" and be encouraging. If a tier=1 product is recommended, mention it's exclusive to Living Result. Do NOT use markdown, bullet points, or headers in the message.
3. For each recommended product, select one flavor from its availableFlavors list (pick the most popular or universally liked, e.g. "Chocolate" or "Unflavored"). If no flavors available, use "Regular".
4. For each recommended product, select the best size (typically the 1kg or mid-range option). If no sizes available, use "Standard".
5. Set suggestStackLab to true ONLY if the user's goal would strongly benefit from a custom combination of products (e.g. they mention wanting both a protein AND a performance boost, or they specifically ask about "combo", "stack", or "bundle").
6. Return ONLY valid JSON in exactly this schema:
{
  "message": "Your conversational recommendation message here.",
  "recommendations": [
    { "productId": "MongoDB id string", "productSlug": "slug string", "productName": "name", "flavor": "selected flavor", "size": "selected size", "reason": "1 short sentence why this product specifically" }
  ],
  "suggestStackLab": false
}`;

    // 4. Call Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
        generationConfig: { temperature: 0.7, responseMimeType: 'application/json' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error (chatRecommend):', errorText);
      return res.status(502).json({ success: false, message: 'AI service is temporarily unavailable. Please try again shortly.' });
    }

    const aiData = await response.json();
    const resultText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) {
      return res.status(500).json({ success: false, message: 'Invalid response from AI model.' });
    }

    let parsed;
    try {
      parsed = JSON.parse(resultText);
    } catch (e) {
      console.error('chatRecommend JSON parse error:', e);
      return res.status(500).json({ success: false, message: 'Failed to parse AI recommendation.' });
    }

    // 5. Enrich recommendations with product images and prices from DB
    const recProductIds = (parsed.recommendations || []).map(r => r.productId);
    const recProducts = await Product.find({ _id: { $in: recProductIds } }).lean();
    const productMap = {};
    recProducts.forEach(p => { productMap[p._id.toString()] = p; });

    const enrichedRecs = (parsed.recommendations || []).map(r => {
      const prod = productMap[r.productId];
      if (!prod) return r;

      // Resolve image: flavors image first, then prod.images[0], then fallback to slug-based image
      let image = '';
      if (prod.flavors && prod.flavors.length > 0) {
        const matchingFlavor = prod.flavors.find(f => f.name && f.name.toLowerCase() === (r.flavor || '').toLowerCase());
        if (matchingFlavor && matchingFlavor.image) {
          image = matchingFlavor.image;
        } else if (prod.flavors[0] && prod.flavors[0].image) {
          image = prod.flavors[0].image;
        }
      }

      if (!image && prod.images && prod.images.length > 0) {
        image = prod.images[0];
      }

      if (!image) {
        image = `/images/${prod.slug}.webp`;
      }

      // Ensure relative image paths start with a leading slash to prevent routing issues
      if (image && !image.startsWith('http') && !image.startsWith('/')) {
        image = '/' + image;
      }

      // Ensure .png extensions are converted to .webp (matching the frontend's format)
      if (image && !image.startsWith('http')) {
        image = image.replace(/\.png$/i, '.webp');
      }

      // Get price for selected size if possible
      const sizeData = (prod.sizes || []).find(s => s.weight === r.size);
      const price = sizeData ? sizeData.price : prod.price;
      return { ...r, image, price };
    });

    return res.status(200).json({
      success: true,
      data: {
        message: parsed.message || '',
        recommendations: enrichedRecs,
        suggestStackLab: !!parsed.suggestStackLab
      }
    });

  } catch (error) {
    console.error('chatRecommend Error:', error);
    res.status(500).json({ success: false, message: 'Server error processing AI recommendation.' });
  }
};
