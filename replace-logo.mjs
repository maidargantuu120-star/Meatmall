import fs from 'fs';
import path from 'path';

const SRC_DIR = path.resolve('./client');

function replaceLogoInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let changed = false;

    const oldLogos = [
        '/logo-meat.svg',
        '/assets/logo-meat.svg',
        '/logo.svg',
        '/assets/logo.svg'
    ];

    oldLogos.forEach(oldLogo => {
        if (content.includes(oldLogo)) {
            // Create a regex to replace safely
            const regex = new RegExp(oldLogo.replace(/\//g, '\\/').replace(/\./g, '\\.'), 'g');
            content = content.replace(regex, '/assets/logo.png'); // use absolute path from public/assets or relative if needed. Actually in Vite, files in public are served at root. Let's use /logo.png but first let's check where logo.png is.
            changed = true;
        }
    });

    // The user put logo.png in client/src/assets/logo.png.
    // We should move it to public/logo.png to make it easy to reference as /logo.png like before.
    // And replace things with /logo.png

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated ${filePath}`);
    }
}

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.html')) {
            replaceLogoInFile(fullPath);
        }
    }
}

// First move the logo to public
const sourceLogo = path.resolve('./client/src/assets/logo.png');
const destLogo = path.resolve('./public/logo.png');

if (fs.existsSync(sourceLogo)) {
    fs.copyFileSync(sourceLogo, destLogo);
    console.log('Moved logo to public folder');
}

processDirectory(SRC_DIR);
console.log('Finished replacing logo paths.');
