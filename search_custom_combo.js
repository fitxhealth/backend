const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (file === 'node_modules' || file === '.next' || file === '.git') continue;
    
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else if (stat.isFile()) {
      if (file.endsWith('.js') || file.endsWith('.jsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('isCustomCombo')) {
          console.log(`Found isCustomCombo in: ${fullPath}`);
        }
      }
    }
  }
}

searchDir(path.join(__dirname, '..'));
