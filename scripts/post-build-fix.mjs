#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

const DIST_DIR = 'dist';

async function addJsExtensions(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await addJsExtensions(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      let content = await fs.readFile(fullPath, 'utf-8');

      // This regex looks for imports from relative paths that don't have an extension
      // e.g., from './file' or from '../file'
      const importRegex = /(from\s+['"]\.\.?\/[^'"]+)(?<!\.js)['"]/g;

      if (importRegex.test(content)) {
        content = content.replace(importRegex, "$1.js'");
        await fs.writeFile(fullPath, content, 'utf-8');
        console.log(`Patched imports in: ${fullPath}`);
      }
    }
  }
}

(async () => {
  try {
    console.log('Starting post-build script to fix ES Module imports...');
    await addJsExtensions(DIST_DIR);
    console.log('Successfully patched all necessary ES Module imports.');
  } catch (error) {
    console.error('Error during post-build script execution:', error);
    process.exit(1);
  }
})();
