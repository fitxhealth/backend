const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkData() {
  try {
    const mongoURI = process.env.MONGO_URI;
    console.log('Connecting to MONGO_URI:', mongoURI);
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    const Order = require('./models/Order');

    const orders = await Order.find().sort({ createdAt: -1 });
    console.log(`Total Orders: ${orders.length}`);

    console.log('\n--- All Orders ---');
    orders.forEach((o, index) => {
      console.log(`[${index + 1}] ID: ${o.orderId}, Customer: ${o.customerDetails?.name}, Total: ₹${o.totalAmount}, Status: ${o.status}, CreatedAt: ${o.createdAt}`);
    });

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error checking data:', error);
    process.exit(1);
  }
}

checkData();
