/* eslint-disable no-undef */
// Using native fetch built into Node.js

async function testProduction() {
  const API_URL = 'https://living-result-backend.onrender.com/api';
  const email = 'chakrabortyrohan526@gmail.com';
  const password = '1234';

  console.log(`Testing authentication against production backend: ${API_URL}`);
  console.log(`Admin email: ${email}`);

  try {
    // 1. Log in
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const loginData = await loginRes.json();
    console.log('Login Response:', loginData);

    if (!loginData.success) {
      console.error('❌ Login failed');
      return;
    }

    const token = loginData.token;
    console.log(`✅ Login successful. JWT token received: ${token.slice(0, 15)}...`);

    // 2. Fetch orders
    console.log('\nFetching orders...');
    const ordersRes = await fetch(`${API_URL}/orders`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const ordersData = await ordersRes.json();
    console.log('Orders Response success:', ordersData.success);
    if (ordersData.success) {
      console.log(`Total Orders returned: ${ordersData.data ? ordersData.data.length : 0}`);
      if (ordersData.data && ordersData.data.length > 0) {
        console.log('First order ID:', ordersData.data[0].orderId);
      }
    } else {
      console.log('Orders Response error:', ordersData.message);
    }

    // 3. Fetch notifications
    console.log('\nFetching notifications (restock requests)...');
    const notifsRes = await fetch(`${API_URL}/notifications`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const notifsData = await notifsRes.json();
    console.log('Notifications Response success:', notifsData.success);
    if (notifsData.success) {
      console.log(`Total Notifications returned: ${notifsData.data ? notifsData.data.length : 0}`);
    } else {
      console.log('Notifications Response error:', notifsData.message);
    }

  } catch (err) {
    console.error('❌ Error during production API test:', err);
  }
}

testProduction();
