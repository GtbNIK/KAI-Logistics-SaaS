const fs = require('fs');
const path = require('path');

const dir = 'd:/PROGRAMACION/ERP_Logistica/frontend/src/services';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Si ya tiene import.meta.env, skip
    if (content.includes('import.meta.env')) {
        return;
    }
    
    const regex = /const API_URL = ['"]\/api\/(.*?)['"];/;
    const match = content.match(regex);
    
    if (match) {
        const endpoint = match[1];
        const replacement = `const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';\nconst API_URL = \`\${BASE_URL}/${endpoint}\`;`;
        content = content.replace(regex, replacement);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${file}`);
    }
});
