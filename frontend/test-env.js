// test-env.js
import fs from 'fs';
import path from 'path';

console.log("Checking for VITE_API_URL in index.html and main.js...");

const distDir = path.join(process.cwd(), 'dist');
const assetsDir = path.join(distDir, 'assets');

if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);
    for (const file of files) {
        if (file.endsWith('.js')) {
            const content = fs.readFileSync(path.join(assetsDir, file), 'utf8');
            if (content.includes('http://localhost:3000')) {
                console.log(`Found localhost reference in ${file}`);
            }
            if (content.includes('productivity-backend-lfla.onrender.com')) {
                console.log(`Found Render API reference in ${file}`);
            }
        }
    }
} else {
    console.log("No dist/assets directory found.");
}
