# Copilot Instructions

## Spotify Token Persistence

By default, Spotify tokens are **not** persisted to disk (`ephemeral mode`). The `logs/spotify_tokens.json` file is cleared on server startup.

To enable persistence (e.g., for production):
1.  Set `SPOTIFY_TOKEN_PERSISTENCE=true` or `SPOTIFY_TOKEN_CACHE_STRATEGY=persistence` in the environment variables.
2.  The server will now load existing tokens on startup and save refreshed tokens to `logs/spotify_tokens.json`.

When modifying token logic, always use `shouldPersistSpotifyTokens()` from `utils/spotifyTokenPersistence.ts` to check this configuration.
