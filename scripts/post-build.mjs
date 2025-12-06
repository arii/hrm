
import fs from 'fs/promises';
import path from 'path';

const distDir = path.resolve(process.cwd(), 'dist');

async function addJsExtensions(dir) {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    const fullPath = path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      await addJsExtensions(fullPath);
    } else if (dirent.isFile() && dirent.name.endsWith('.js')) {
      let content = await fs.readFile(fullPath, 'utf8');
      const importRegex = /(import .* from\s+['"]\.\.?\/[^'"]+)(['"])/g;
      if (importRegex.test(content)) {
        content = content.replace(importRegex, (match, p1, p2) => {
          if (path.extname(p1) === '') {
            return `${p1}.js${p2}`;
          }
          return match;
        });
        await fs.writeFile(fullPath, content, 'utf8');
      }
    }
  }
}

addJsExtensions(distDir)
  .then(() => console.log('Successfully added .js extensions to imports.'))
  .catch((err) => console.error('Error adding .js extensions:', err));
