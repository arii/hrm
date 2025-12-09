#!/usr/bin/env node
// scripts/add-js-extensions.mjs
import fs from 'fs'
import path from 'path'

const DIST_DIR = 'dist'

async function addJsExtensions(dir) {
  const dirents = await fs.promises.readdir(dir, { withFileTypes: true })
  for (const dirent of dirents) {
    const fullPath = path.join(dir, dirent.name)
    if (dirent.isDirectory()) {
      await addJsExtensions(fullPath)
    } else if (dirent.isFile() && dirent.name.endsWith('.js')) {
      let content = await fs.promises.readFile(fullPath, 'utf8')
      // This regex uses a negative lookbehind to avoid adding .js if it's already there.
      content = content.replace(/(from\s+['"]\.\.?\/[^'"]+)(?<!\.js)(['"])/g, '$1.js$2')
      await fs.promises.writeFile(fullPath, content, 'utf8')
    }
  }
}

async function main() {
  try {
    console.log(`Adding .js extensions to relative imports in ${DIST_DIR}...`)
    await addJsExtensions(DIST_DIR)
    console.log('Successfully added .js extensions.')
  } catch (error) {
    console.error('Error adding .js extensions:', error)
    process.exit(1)
  }
}

main()
