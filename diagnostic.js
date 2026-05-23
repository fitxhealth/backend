require('dotenv').config();
const mongoose = require('mongoose');

async function checkDB() {
  try {
    const uri = process.env.MONGO_URI || 'mongodb+srv://rohandebnath96:69Xj4Z2QyZk1A6d8@cluster0.h49b6.mongodb.net/rohan-living-result?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to DB');
    
    // Check products
    const db = mongoose.connection.db;
    const products = await db.collection('products').find({}).toArray();
    console.log(`Found ${products.length} products in DB.`);
    products.forEach(p => console.log(`- ${p.id}: ${p.name} (slug: ${p.slug})`));

    mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err);
  }
}

checkDB();
