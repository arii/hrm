// File: services/spotifyTokenManager.ts
import { PrismaClient } from '@prisma/client'
import { AccessToken } from '@spotify/web-api-ts-sdk'
import logger from '../utils/logger'

export class SpotifyTokenManager {
  private clientId: string
  private clientSecret: string
  private sdkAccessToken: AccessToken | null = null
  private prisma: PrismaClient

  constructor(
    clientId: string,
    clientSecret: string,
    prismaClient?: PrismaClient
  ) {
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.prisma = prismaClient || new PrismaClient()
  }

  public getSdkAccessToken(): AccessToken | null {
    return this.sdkAccessToken
  }

  public async getValidAccessToken(): Promise<string | null> {
    const account = await this.prisma.account.findFirst({
      where: { provider: 'spotify' },
    })

    if (!account || !account.refresh_token) {
      logger.warn('No Spotify account or refresh token found in the database.')
      return null
    }

    if (account.expires_at && Date.now() < account.expires_at * 1000 - 60000) {
      this.sdkAccessToken = {
        access_token: account.access_token!,
        token_type: account.token_type!,
        expires_in: Math.floor((account.expires_at * 1000 - Date.now()) / 1000),
        refresh_token: account.refresh_token,
      }
      return account.access_token
    }

    logger.info('Spotify access token expired, refreshing...')
    return this.refreshAccessToken(account.refresh_token)
  }

  private async refreshAccessToken(
    refreshToken: string
  ): Promise<string | null> {
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization:
            'Basic ' +
            Buffer.from(this.clientId + ':' + this.clientSecret).toString(
              'base64'
            ),
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      })

      const refreshedTokens = await response.json()

      if (!response.ok) {
        throw refreshedTokens
      }

      const newExpiresAt = Math.floor(
        Date.now() / 1000 + refreshedTokens.expires_in
      )

      await this.prisma.account.updateMany({
        where: { provider: 'spotify', refresh_token: refreshToken },
        data: {
          access_token: refreshedTokens.access_token,
          expires_at: newExpiresAt,
          refresh_token: refreshedTokens.refresh_token ?? refreshToken,
        },
      })

      this.sdkAccessToken = {
        access_token: refreshedTokens.access_token,
        token_type: refreshedTokens.token_type,
        expires_in: refreshedTokens.expires_in,
        refresh_token: refreshedTokens.refresh_token ?? refreshToken,
      }

      logger.info('Successfully refreshed and updated Spotify token.')
      return refreshedTokens.access_token
    } catch (error) {
      logger.error({ error }, 'Failed to refresh access token')
      return null
    }
  }
}
