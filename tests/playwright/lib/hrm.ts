// File: tests/playwright/lib/hrm.ts
import { execSync } from 'child_process'
import path from 'path'

const HRM_DATA_PATH = path.join(process.cwd(), 'logs', 'hrm_data.json')

export const seedHrmData = async () => {
  // Clear any existing HRM data
  execSync(`echo "[]" > ${HRM_DATA_PATH}`)
  // Run the seed script
  execSync('pnpm run seed')
}
