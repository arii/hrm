import { AccessToken } from '@spotify/web-api-ts-sdk'
import fs from 'fs/promises'
import * as path from 'path'
import { SpotifyTokenResponse } from './spotifyPolling'
import { EncryptionService } from '../utils/encryption'

export interface SpotifyTokenPayload {
  provider: string
  sub: string
  access_token: string
  refresh_token: string
  expires_in: number
  scope: string
  obtainedAt: number
}

export interface TokenRecord {
  receivedAt: number
  payload: SpotifyTokenPayload
}

export class SpotifyTokenManager {
  private tokenFile: string
  private currentToken: TokenRecord | null = null
  private refreshPromise: Promise<boolean> | null = null
  private encryptionService: EncryptionService

  constructor(
    private clientId: string,
    private clientSecret: string,
    logDir: string = path.resolve(process.cwd(), 'logs')
  ) {
    const encryptionKey = process.env.ENCRYPTION_KEY
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY is not set in the environment variables.')
    }
    this.encryptionService = new EncryptionService(encryptionKey)
    this.tokenFile = path.join(logDir, 'spotify_tokens.json')
  }

  public async setTokenData(tokenPayload: SpotifyTokenPayload): Promise<void> {
    this.currentToken = {
      receivedAt: Date.now(),
      payload: tokenPayload,
    }
    await this.saveTokens(this.currentToken)
  }

  private async saveTokens(tokenRecord: TokenRecord): Promise<void> {
    try {
      const recordToSave = JSON.parse(JSON.stringify(tokenRecord))

      if (recordToSave.payload.refresh_token) {
        recordToSave.payload.refresh_token =
          await this.encryptionService.encrypt(
            recordToSave.payload.refresh_token
          )
      }

      await fs.writeFile(
        this.tokenFile,
        JSON.stringify(recordToSave, null, 2),
        'utf8'
      )
    } catch (err) {
      console.error('Failed to save Spotify tokens:', err)
      throw err
    }
  }

  private async loadTokens(): Promise<void> {
    try {
      await fs.access(this.tokenFile)
      const data = await fs.readFile(this.tokenFile, 'utf8')
      const record = JSON.parse(data) as TokenRecord

      if (record.payload.refresh_token) {
        try {
          record.payload.refresh_token = await this.encryptionService.decrypt(
            record.payload.refresh_token
          )
        } catch (decryptionError) {
          console.error(
            'Failed to decrypt refresh token. Deleting corrupted file.',
            decryptionError
          )
          this.currentToken = null
          await fs.unlink(this.tokenFile)
          return
        }
      }
      this.currentToken = record
    } catch {
      this.currentToken = null
    }
  }

  private async refreshToken(): Promise<boolean> {
    if (!this.currentToken?.payload.refresh_token) return false

    try {
      const basic = Buffer.from(
        `${this.clientId}:${this.clientSecret}`
      ).toString('base64')
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.currentToken.payload.refresh_token,
        }).toString(),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }

      const data = (await response.json()) as SpotifyTokenResponse
      this.currentToken = {
        receivedAt: Date.now(),
        payload: {
          ...this.currentToken.payload,
          access_token: data.access_token,
          expires_in: data.expires_in,
          refresh_token:
            data.refresh_token ?? this.currentToken.payload.refresh_token,
          obtainedAt: Date.now(),
        },
      }

      await this.saveTokens(this.currentToken)
      return true
    } catch (err) {
      console.error('Failed to refresh Spotify token:', err)
      return false
    }
  }

  async getValidAccessToken(): Promise<string | null> {
    await this.loadTokens()
    if (!this.currentToken) return null

    const expiresAt =
      this.currentToken.payload.obtainedAt +
      this.currentToken.payload.expires_in * 1000

    if (Date.now() >= expiresAt - 60000) {
      if (!this.refreshPromise) {
        this.refreshPromise = this.refreshToken().then((success) => {
          this.refreshPromise = null
          return success
        })
      }
      await this.refreshPromise
    }

    return this.currentToken?.payload.access_token ?? null
  }

  getUserId(): string | null {
    return this.currentToken?.payload.sub ?? null
  }

  async getCurrentRefreshToken(): Promise<string | null> {
    if (!this.currentToken) {
      await this.loadTokens()
    }
    return this.currentToken?.payload.refresh_token ?? null
  }

  getSdkAccessToken(): AccessToken | null {
    if (!this.currentToken) return null
    return {
      access_token: this.currentToken.payload.access_token,
      token_type: 'Bearer',
      expires_in: this.currentToken.payload.expires_in,
      refresh_token: this.currentToken.payload.refresh_token,
      expires:
        this.currentToken.payload.obtainedAt +
        this.currentToken.payload.expires_in * 1000,
    }
  }
}
