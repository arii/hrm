import { db } from '@/lib/db'
import { Account } from '@prisma/client'

/**
 * Accesses the system-designated Spotify account from the database.
 */
export class SystemAccountAccessor {
  /**
   * Retrieves the Account object designated for System/Studio playback.
   *
   * Logic:
   * 1. Find the account explicitly marked as the system token (`isSystemToken: true`).
   * 2. If no explicit token is found, fall back to the first available Spotify account.
   *
   * @returns {Promise<Account | null>} The Account object if found, otherwise null.
   */
  static async getSystemAccount(): Promise<Account | null> {
    let account = await db.account.findFirst({
      where: {
        provider: 'spotify',
        isSystemToken: true,
      },
    })

    if (!account) {
      console.log(
        '[SystemAccountAccessor] No explicit system token found, falling back to first available Spotify account.'
      )
      account = await db.account.findFirst({
        where: { provider: 'spotify' },
      })
    }

    if (!account) {
      console.warn(
        '[SystemAccountAccessor] No Spotify account found in the database.'
      )
      return null
    }

    if (!account.access_token) {
      console.warn(
        `[SystemAccountAccessor] Spotify account found for user ${account.userId}, but it has no access token.`
      )
      return null
    }

    return account
  }
}
