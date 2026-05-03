const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables from .env
const Product = require('./models/Product');

// Make sure to replace this with your actual MongoDB URI if you use MongoDB Atlas!
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/livingresult';

// Helper function to create URL-friendly slugs (e.g., "Hulk Mass Gainer" -> "hulk-mass-gainer")
const generateSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

// Your exact data from script.js
const productsToSeed = [
    {
        id: 1, name: "Hulk Mass Gainer", price: 1150, oldPrice: 4299, discount: 18, rating: 3.5, reviews: 29,
        bestSeller: false, category: "common", stockLeft: 12,
        description: "Hulk Mass Gainer is designed for extreme muscle growth and quick recovery. Packed with high-quality calories to help you pack on size fast. *DISCLAIMER :Best results with calorie surplus, resistance training and proper routine. Individual weight gain results may vary.",
        ingredients: "Maltodextrin, Whey Protein Concentrate, Cocoa Powder, Artificial Flavors, Sucralose.",
        nutritionalFacts: ["Calories: 1200 kcal", "Protein: 50g", "Carbohydrates: 250g", "Fat: 5g"],
        flavors: [{ name: "Chocolate", image: "images/hulk-mass-gainer.png", inStock: true }, { name: "Vanilla", image: "images/creatine.png", inStock: false }],
        weight: "2.2 lbs (1 kg)"
    },
    {
        id: 2, name: "Hydra Mass Gainer", price: 1799, oldPrice: 2050, discount: 12.5, rating: 4, reviews: 43,
        bestSeller: false, category: "unique", stockLeft: 8,
        description: "Hydra Mass Gainer provides a balanced ratio of proteins and complex carbs to fuel your hardest workouts and drive muscle synthesis. *DISCLAIMER :Best results with calorie surplus, resistance training and proper routine. Individual weight gain results may vary.",
        ingredients: "Oat Flour, Whey Protein Isolate, Natural Flavors, Stevia.",
        nutritionalFacts: ["Calories: 1000 kcal", "Protein: 45g", "Carbohydrates: 200g", "Fat: 4g"],
        flavors: [
            { name: "Malai Kulfi", image: "images/hydra-mass-gainer.png", inStock: true }, { name: "Creamy Banana Nuts", image: "images/hydra-mass-gainer-cbn.png", inStock: true },
            { name: "Belgium Chocolate", image: "images/hydra-mass-gainer-bc.png", inStock: true }, { name: "Spanish Strawberry", image: "images/hydra-mass-gainer-ss.png", inStock: true },
            { name: "Irish Cookie", image: "images/hydra-mass-gainer-ic.png", inStock: true }
        ],
        weight: "2 lbs (907 kg)"
    },
    {
        id: 3, name: "Hydra Whey Protein", price: 2359, oldPrice: 2900, discount: 18.67, rating: 5, reviews: 31,
        bestSeller: true, category: "common", stockLeft: 24,
        description: "Premium fast-absorbing whey protein to ignite muscle protein synthesis immediately after your workouts. *DISCLAIMER :Contains dairy ingredients. Not suitable for individuals with lactose sensitivity unless tolerated",
        ingredients: "Whey Protein Isolate, Whey Protein Concentrate, Digestive Enzymes.",
        nutritionalFacts: ["SERVING SIZE: 1 scoop (33g)", "Energy: 119 kcal", "Protein: 26g", "Carbohydrates: 3.9g", "Fat: 1.1g", "Sugar: 1g"],
        flavors: [
            { name: "Malai Kulfi", image: "images/hydra-whey-protein.png", inStock: true }, { name: "Creamy Banana Nuts", image: "images/hydra-whey-protein-cbn.png", inStock: true },
            { name: "Belgium Chocolate", image: "images/hydra-whey-protein-bc.png", inStock: true }, { name: "Spanish Strawberry", image: "images/hydra-whey-protein-ss.png", inStock: true },
            { name: "Irish Cookie", image: "images/hydra-whey-protein-ic.png", inStock: true }
        ],
        weight: "2 lbs (907 g)"
    },
    {
        id: 4, name: "ISO Plasma Zero Protein", price: 1699, oldPrice: 4000, discount: 57.5, rating: 5, reviews: 50,
        bestSeller: true, category: "unique", stockLeft: 5,
        description: "The purest form of protein. Zero carbs, zero fat, 100% pure isolate for serious athletes demanding the best. *DISCLAIMER :Contains dairy ingredients. Not suitable for individuals with lactose sensitivity unless tolerated",
        ingredients: "Whey Protein Isolate, Cocoa Powder, Dextrose, Sweetening Agent (INS 950 & INS 955), Anticaking Agent (INS 551).",
        nutritionalFacts: ["SERVING SIZE: Per 100g (approx)", "Energy: 350.92 kcal", "Protein: 78.4g", "Carbohydrates: 8.39g", "Fat: 1.99g", "Added Suger: 0.00g"],
        flavors: [{ name: "Triple Chocolate", image: "images/iso-plasma-zero-protein.png", inStock: true }],
        weight: "3 lbs (1.36 kg)"
    },
    {
        id: 101, name: "Mass Builder Stack (2 Products)", price: 5999, oldPrice: 7799, discount: 23, rating: 5, reviews: 87,
        bestSeller: true, category: "combos", stockLeft: 10,
        description: "The ultimate mass building stack. Hulk Mass Gainer fuels your caloric surplus while Hydra Whey Protein supports lean muscle synthesis.",
        ingredients: "Includes: 1x Hulk Mass Gainer (1kg) + 1x Hydra Whey Protein (500g)",
        nutritionalFacts: ["Combined Calories: ~1320 kcal per day", "Combined Protein: ~76g per day", "Ideal for: Bulking & Mass Gain"],
        flavors: [{ name: "Chocolate Gainer + Double Chocolate Whey", image: "images/hulk-mass-gainer.png", inStock: true }, { name: "Vanilla Gainer + Strawberry Whey", image: "images/hulk-mass-gainer.png", inStock: true }],
        weight: "3.3 lb (1.5 kg)"
    }
];

const seedDatabase = async () => {
    console.log('⏳ Attempting to connect to MongoDB...');
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        await Product.deleteMany(); // Clear existing
        console.log('🗑️  Cleared existing products');

        const productsWithSlugs = productsToSeed.map(p => ({ ...p, slug: generateSlug(p.name) }));
        await Product.insertMany(productsWithSlugs);

        console.log('🚀 Successfully seeded Products into MongoDB!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
};
seedDatabase();
