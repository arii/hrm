/**
 * Architecture guard: the audio manager's unlock (`loadAudio`) must have
 * exactly one entry point — TimerSoundProvider's global first-interaction
 * listener (spec art_uI0w7D6m, D6).
 *
 * @jest-environment node
 */
import fs from 'fs'
import path from 'path'

const PROJECT_ROOT = path.resolve(__dirname, '../../..')

const SOURCE_DIRS = ['components', 'hooks', 'context', 'utils', 'lib', 'app']
const ALLOWED_FILES = new Set([
  path.resolve(PROJECT_ROOT, 'utils/audioManager.ts'), // owns the method
  path.resolve(PROJECT_ROOT, 'components/TimerSoundProvider.tsx'), // the one entry point
])

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return entry.isFile() && /\.(ts|tsx)$/.test(entry.name) ? [full] : []
  })

describe('single audio-unlock entry point (D6)', () => {
  it('no module other than TimerSoundProvider calls audioManager.loadAudio', () => {
    const offenders: string[] = []

    for (const dir of SOURCE_DIRS) {
      const abs = path.join(PROJECT_ROOT, dir)
      if (!fs.existsSync(abs)) continue
      for (const file of walk(abs)) {
        if (ALLOWED_FILES.has(file)) continue
        if (/\.loadAudio\s*\(/.test(fs.readFileSync(file, 'utf8'))) {
          offenders.push(path.relative(PROJECT_ROOT, file))
        }
      }
    }

    expect(offenders).toEqual([])
  })
})
