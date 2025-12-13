import { db } from '@/lib/db'
import { Account } from '@prisma/client'

/**
 * Manages retrieval of Spotify API tokens from the database.
 * This class provides a centralized way for backend services to get the
 * correct access token for performing Spotify API operations.
 */
export class SpotifyTokenManager {
  /**
   * Retrieves the Account object designated for System/Studio playback.
   * This is the central method for the backend to get credentials for Spotify API calls.
   *
   * Logic:
   * 1. Find the account explicitly marked as the system token (`isSystemToken: true`).
   * 2. If no explicit token is found, fall back to the first available Spotify account.
   *    This simplifies setup for single-user instances where designating a system token is redundant.
   *
   * @returns {Promise<Account | null>} The Account object if found, otherwise null.
   */
  static async getSystemAccount(): Promise<Account | null> {
    // 1. Try to find the explicitly designated system token first.
    let account = await db.account.findFirst({
      where: {
        provider: 'spotify',
        isSystemToken: true,
      },
    })

    // 2. If no explicit system token is found, fall back for single-user setups.
    if (!account) {
      console.log(
        '[TokenManager] No explicit system token found, falling back to first available Spotify account.'
      )
      account = await db.account.findFirst({
        where: { provider: 'spotify' },
      })
    }

    if (!account) {
      console.warn('[TokenManager] No Spotify account found in the database.')
      return null
    }

    if (!account.access_token) {
      console.warn(
        `[TokenManager] Spotify account found for user ${account.userId}, but it has no access token.`
      )
      return null
    }

    return account
  }
}
