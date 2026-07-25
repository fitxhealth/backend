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
      if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.html') || file.endsWith('.json') || file.endsWith('.env') || file.endsWith('.ts') || file.endsWith('.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('onrender.com')) {
          console.log(`Found in: ${fullPath}`);
          // Print matching lines
          const lines = content.split('\n');
          lines.forEach((line, index) => {
            if (line.includes('onrender.com')) {
              console.log(`  Line ${index + 1}: ${line.trim()}`);
            }
          });
        }
      }
    }
  }
}

searchDir(path.join(__dirname, '..'));
