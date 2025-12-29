// scripts/copy-standalone-assets.js
import { cp } from 'fs/promises'
import { join } from 'path'

const copyAssets = async () => {
  try {
    const standaloneDir = join(process.cwd(), '.next/standalone')
    const publicDir = join(process.cwd(), 'public')
    const staticDir = join(process.cwd(), '.next/static')
    const cacheDir = join(process.cwd(), '.next/cache')
    const distDir = join(process.cwd(), 'dist')

    await cp(publicDir, join(standaloneDir, 'public'), { recursive: true })
    await cp(staticDir, join(standaloneDir, '.next/static'), {
      recursive: true,
    })
    await cp(cacheDir, join(standaloneDir, '.next/cache'), { recursive: true })
    await cp(distDir, join(standaloneDir, 'dist'), { recursive: true })

    console.log('Standalone assets copied successfully.')
  } catch (error) {
    console.error('Error copying standalone assets:', error)
    process.exit(1)
  }
}

copyAssets()
