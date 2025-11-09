import fs from "fs";
import fetch from "node-fetch";
import path from "path";

export interface SpotifyTokenPayload {
  provider: string;
  sub: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  obtainedAt: number;
}

export interface TokenRecord {
  receivedAt: number;
  payload: SpotifyTokenPayload;
}

export class SpotifyTokenManager {
  private tokenFile: string;
  private currentToken: TokenRecord | null = null;
  private refreshPromise: Promise<void> | null = null;

  constructor(
    private clientId: string,
    private clientSecret: string,
    logDir: string = path.resolve(process.cwd(), "logs")
  ) {
    this.tokenFile = path.join(logDir, "spotify_tokens.json");
    this.loadTokens();
  }

  private loadTokens() {
    try {
      if (fs.existsSync(this.tokenFile)) {
        const data = fs.readFileSync(this.tokenFile, "utf8");
        this.currentToken = JSON.parse(data) as TokenRecord;
        console.log(
          "Loaded Spotify tokens for:",
          this.currentToken.payload.sub
        );
      }
    } catch (err) {
      console.warn("Failed to load Spotify tokens:", err);
    }
  }

  private async refreshToken(): Promise<boolean> {
    if (!this.currentToken?.payload.refresh_token) return false;

    try {
      const basic = Buffer.from(
        `${this.clientId}:${this.clientSecret}`
      ).toString("base64");

      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${basic}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: this.currentToken.payload.refresh_token,
        }).toString(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data: any = await response.json();

      // Update current token with new values
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
      };

      // Save updated token
      fs.writeFileSync(
        this.tokenFile,
        JSON.stringify(this.currentToken, null, 2),
        "utf8"
      );

      console.log(
        "Refreshed Spotify token for:",
        this.currentToken.payload.sub
      );
      return true;
    } catch (err) {
      console.error("Failed to refresh Spotify token:", err);
      return false;
    }
  }

  async getValidAccessToken(): Promise<string | null> {
    if (!this.currentToken) return null;

    // Check if token needs refresh
    const expiresAt =
      this.currentToken.payload.obtainedAt +
      this.currentToken.payload.expires_in * 1000;

    if (Date.now() >= expiresAt - 60000) {
      // Refresh if within 1 minute of expiry
      // Ensure only one refresh happens at a time
      if (!this.refreshPromise) {
        this.refreshPromise = this.refreshToken()
          .then(() => {
            this.refreshPromise = null;
          })
          .catch(() => {
            this.refreshPromise = null;
          });
      }
      await this.refreshPromise;
    }

    return this.currentToken.payload.access_token;
  }

  getUserId(): string | null {
    return this.currentToken?.payload.sub ?? null;
  }
}
