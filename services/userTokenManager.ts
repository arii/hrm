// File: services/userTokenManager.ts (Manages Spotify tokens for multiple users)
/**
 * User Token Manager: Handles storage, retrieval, and refreshing of Spotify tokens
 * for multiple users, using encrypted browser cookies for persistence.
 */
import crypto from "crypto";
import fetch from "node-fetch";
import { SpotifyTokenResponse } from "./spotifyPolling.js";

// Use a strong, consistent algorithm for encryption
const ALGORITHM = "aes-256-cbc";

export interface SpotifyTokenPayload {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  obtained_at: number; // Use consistent snake_case from Spotify
}

export class UserTokenManager {
  private encryptionKey: Buffer;
  private clientId: string;
  private clientSecret: string;
  private userTokens: Map<string, SpotifyTokenPayload> = new Map();

  constructor(clientId: string, clientSecret: string) {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey || encryptionKey.length !== 64) {
      throw new Error(
        "ENCRYPTION_KEY environment variable is not set or is not a 64-character hex string."
      );
    }
    this.encryptionKey = Buffer.from(encryptionKey, "hex");
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  // --- Encryption/Decryption ---

  /**
   * Encrypts a refresh token for safe storage in a cookie.
   */
  public encrypt(token: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);
    let encrypted = cipher.update(token, "utf8", "hex");
    encrypted += cipher.final("hex");
    return `${iv.toString("hex")}:${encrypted}`;
  }

  /**
   * Decrypts a refresh token from a cookie.
   */
  public decrypt(encryptedToken: string): string | null {
    try {
      const parts = encryptedToken.split(":");
      if (parts.length !== 2) return null;
      const iv = Buffer.from(parts[0], "hex");
      const encrypted = parts[1];
      const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv);
      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (error) {
      console.error("Decryption failed:", error);
      return null;
    }
  }

  // --- Token Management ---

  /**
   * Stores a user's token payload in memory. Called after a successful login/refresh.
   */
  public saveTokenForUser(userId: string, token: SpotifyTokenPayload) {
    this.userTokens.set(userId, token);
    console.log(`Tokens saved in memory for user: ${userId}`);
  }

  /**
   * Retrieves a user's token payload from memory.
   */
  public getTokenForUser(userId: string): SpotifyTokenPayload | undefined {
    return this.userTokens.get(userId);
  }

  /**
   * Refreshes an access token for a specific user using their refresh token.
   */
  private async refreshTokenForUser(userId: string, refreshToken: string): Promise<SpotifyTokenPayload | null> {
    try {
      const authString = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${authString}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }).toString(),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Token refresh failed for user ${userId}: ${response.status} - ${errorBody}`);
        this.userTokens.delete(userId); // Token is invalid, remove it
        return null;
      }

      const data = (await response.json()) as SpotifyTokenResponse;
      const newPayload: SpotifyTokenPayload = {
        access_token: data.access_token,
        refresh_token: data.refresh_token ?? refreshToken, // Keep old refresh token if not provided
        expires_in: data.expires_in,
        obtained_at: Date.now(),
      };

      this.saveTokenForUser(userId, newPayload);
      console.log(`Refreshed Spotify token for user: ${userId}`);
      return newPayload;
    } catch (err) {
      console.error(`Error refreshing token for user ${userId}:`, err);
      return null;
    }
  }

  /**
   * Gets a valid access token for a user, refreshing it if necessary.
   */
  public async getValidAccessTokenForUser(userId: string, encryptedRefreshToken?: string): Promise<string | null> {
    let userPayload = this.getTokenForUser(userId);

    // If not in memory, try to decrypt from provided cookie
    if (!userPayload && encryptedRefreshToken) {
      const refreshToken = this.decrypt(encryptedRefreshToken);
      if (refreshToken) {
        console.log(`User ${userId} not in memory, attempting token refresh from cookie.`);
        userPayload = await this.refreshTokenForUser(userId, refreshToken);
      }
    }

    if (!userPayload) {
      return null;
    }

    // Check if token is expired (with a 60-second buffer)
    const expiresAt = userPayload.obtained_at + (userPayload.expires_in * 1000);
    if (Date.now() >= expiresAt - 60000) {
      console.log(`Access token for ${userId} is expiring, refreshing...`);
      const refreshedPayload = await this.refreshTokenForUser(userId, userPayload.refresh_token);
      return refreshedPayload?.access_token ?? null;
    }

    return userPayload.access_token;
  }

  /**
   * Retrieves the current refresh token for a user.
   * This is useful for setting the encrypted cookie upon login.
   */
  public getRefreshTokenForUser(userId: string): string | null {
    return this.userTokens.get(userId)?.refresh_token ?? null;
  }
}
