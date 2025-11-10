# Troubleshooting Guide

This guide provides solutions for common issues encountered during development and production.

## Production Deployment

### Prerequisites

- Node.js & npm
- PM2 (`npm install -g pm2`)
- Nginx
- A domain name with DDNS
- An SSL certificate (Let's Encrypt is recommended)

### Deployment Steps

1.  **Build and Deploy**: Run `./deploy.sh` to build the application and start it with PM2.
2.  **Nginx Configuration**: Ensure Nginx is configured to proxy requests to port 3000 with WebSocket support.
3.  **SSL Configuration**: Ensure SSL certificates are configured and renewed as needed.
4.  **PM2 Startup**: Configure PM2 to start on boot with `pm2 startup`.

## Server Bringup

### Port 3000 Already in Use

- **Symptom**: `Error: listen EADDRINUSE: address already in use :::3000`
- **Solution**: Find and kill the process using port 3000, or use `npm run pm2:stop`.

### Module Resolution Errors

- **Symptom**: `Error [ERR_MODULE_NOT_FOUND]: Cannot find module ...`
- **Solution**: Use `npm run dev` for development, and ensure your `tsconfig.json` is configured for CommonJS modules.

### TypeScript Compilation Errors

- **Symptom**: `error TS2307: Cannot find module ...`
- **Solution**: Verify the file exists, the import path is correct, and the file is included in your `tsconfig.json`.

## Spotify Integration

### "Invalid Client" Error

- **Cause**: Spotify doesn't recognize your credentials.
- **Fix**: Verify your Client ID and Secret in `.env.local` and restart the server.

### "Redirect URI Mismatch" Error

- **Cause**: The redirect URI in the Spotify dashboard doesn't match your NextAuth configuration.
- **Fix**: Add the correct redirect URI to your Spotify app settings.

### Token Not Persisting

- **Symptom**: You have to log in every time the server restarts.
- **Fix**: Check that the `logs/spotify_tokens.json` file exists and is writable.
