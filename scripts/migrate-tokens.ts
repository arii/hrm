// scripts/migrate-tokens.ts
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import logger from '../utils/logger'

const prisma = new PrismaClient()

const LOG_DIR = path.resolve(process.cwd(), 'logs')
const TOKEN_FILE = path.join(LOG_DIR, 'spotify_tokens.json')

async function main() {
  if (!fs.existsSync(TOKEN_FILE)) {
    logger.info('Token file not found, skipping migration.')
    return
  }

  const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'))
  const { payload } = tokenData

  if (!payload) {
    logger.warn('No payload found in token file, skipping migration.')
    return
  }

  const { sub, access_token, refresh_token, expires_in, scope } = payload

  // Create a user for the Spotify account
  const user = await prisma.user.create({
    data: {
      name: sub, // Using the Spotify ID as the name for now
      email: `${sub}@spotify.com`, // Create a dummy email
    },
  })

  // Create the account linked to the user
  await prisma.account.create({
    data: {
      userId: user.id,
      type: 'oauth',
      provider: 'spotify',
      providerAccountId: sub,
      access_token,
      refresh_token,
      expires_at: Math.floor(Date.now() / 1000 + expires_in),
      token_type: 'Bearer',
      scope,
    },
  })

  logger.info('Successfully migrated token data to the database.')
}

main()
  .catch((e) => {
    logger.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
