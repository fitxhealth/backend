const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/script.js');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('--- Search for addToCartFromPage ---');
lines.forEach((line, index) => {
  if (line.includes('addToCartFromPage')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
