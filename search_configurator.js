const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../nextjs-frontend/components/ComboConfigurator.jsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('--- Search in ComboConfigurator.jsx ---');
lines.forEach((line, index) => {
  if (line.includes('isCustomCombo') || line.includes('addItem') || line.includes('addToCart')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
