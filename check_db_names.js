const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkDbs() {
  try {
    const mongoURI = process.env.MONGO_URI;
    console.log('Connecting to Mongo URI:', mongoURI);
    const client = new MongoClient(mongoURI);
    await client.connect();
    console.log('Connected!');

    const adminDb = client.db().admin();
    const dbs = await adminDb.listDatabases();
    console.log('\n--- Databases on this cluster ---');
    dbs.databases.forEach(db => {
      console.log(`- Name: ${db.name}, Size: ${db.sizeOnDisk} bytes`);
    });

    // List collections for each database that might be ours
    for (const dbInfo of dbs.databases) {
      if (dbInfo.name === 'admin' || dbInfo.name === 'local' || dbInfo.name === 'config') continue;
      const db = client.db(dbInfo.name);
      const cols = await db.listCollections().toArray();
      console.log(`\nCollections in DB "${dbInfo.name}":`);
      cols.forEach(c => console.log(`  * ${c.name}`));
    }

    await client.close();
  } catch (err) {
    console.error('Error:', err);
  }
}

checkDbs();
