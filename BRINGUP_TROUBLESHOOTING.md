# Server Bringup Troubleshooting

Common issues when starting the HRM development server and their solutions.

## Quick Diagnostics

```bash
# Check if server is already running
lsof -i :3000

# Test TypeScript compilation
npm run build:server

# Check for TypeScript errors
npx tsc --noEmit

# View recent server logs
npm run pm2:logs
```

---

## Common Issues

### Port 3000 Already in Use

**Symptoms:**

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**

```bash
# Find and kill the process
lsof -i :3000
kill -9 <PID>

# Or use PM2 to stop
npm run pm2:stop
```

---

### Module Resolution Errors

**Symptoms:**

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/home/user/hrm/dist/services/spotifyPolling'
TypeError: Unknown file extension ".ts"
```

**Cause:** Mismatch between module system (ES modules vs CommonJS) or incorrect script usage.

**Solution:**

1. **For development**, use `ts-node` with CommonJS:

   ```bash
   npm run dev
   # or
   npm run dev:clean
   ```

2. **Verify package.json scripts** use ts-node for dev:

   ```json
   "dev": "cross-env NODE_ENV=development HOST=127.0.0.1 ts-node --transpile-only --compiler-options '{\"module\":\"CommonJS\",\"moduleResolution\":\"node\"}' server.ts"
   ```

3. **Don't run** `node dist/server.js` in development - that's for production only after `npm run build`

4. **Check tsconfig.json** has CommonJS modules:
   ```json
   {
     "compilerOptions": {
       "module": "CommonJS",
       "moduleResolution": "node"
     }
   }
   ```

---

### TypeScript Compilation Errors

**Symptoms:**

```
error TS2307: Cannot find module './services/spotifyPolling' or its corresponding type declarations.
```

**Solution:**

1. Check the file exists: `ls -l services/spotifyPolling.ts`
2. Verify import path doesn't have `.ts` extension:
   ```typescript
   import SpotifyPolling from "./services/spotifyPolling"; // ✓ Correct
   import SpotifyPolling from "./services/spotifyPolling.ts"; // ✗ Wrong
   ```
3. Run `npm run build:server` to see full error details
4. Check `tsconfig.json` includes the file in scope

---

### Express Routing Errors

**Symptoms:**

```
TypeError: Missing parameter name at index 1: *
RangeError: Maximum call stack size exceeded
```

**Cause:** Incorrect wildcard route or recursive handler.

**Solution:**

Check `server.ts` routing uses `expressApp.use()` not `expressApp.all("*")`:

```typescript
// ✓ Correct
expressApp.use((req: Request, res: Response) => {
  return handle(req, res);
});

// ✗ Wrong - causes infinite loop
expressApp.all("*", (req: Request, res: Response) => {
  return handle(req, res);
});
```

---

### PM2 Daemon Issues

**Symptoms:**

```
PM2 is out-of-date
Process list is not synchronized
```

**Solution:**

```bash
# Update PM2
pm2 update

# Synchronize process list
pm2 save

# If problems persist, restart PM2 daemon
pm2 kill
pm2 start ecosystem.config.js
```

---

### Next.js Preparation Failed

**Symptoms:**

```
Next.js preparation failed: TypeError: ...
```

**Solution:**

1. Clean Next.js cache:

   ```bash
   rm -rf .next
   npm run dev
   ```

2. Check Node version (requires 18+):

   ```bash
   node --version
   ```

3. Reinstall dependencies:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

---

### WebSocket Server Not Starting

**Symptoms:**

- No "WebSocket Server listening" message in logs
- Client connections fail with "Connection refused"

**Solution:**

1. Check server logs for errors:

   ```bash
   npm run pm2:logs | grep -i websocket
   ```

2. Verify `server.ts` WebSocket setup:

   ```typescript
   const wss = new WebSocketServer({ noServer: true });
   server.on("upgrade", (req, socket, head) => {
     if (pathname === "/ws") {
       wss.handleUpgrade(req, socket, head, (ws) => {
         wss.emit("connection", ws, req);
       });
     }
   });
   ```

3. Test WebSocket connection:
   ```bash
   npm install -g wscat
   wscat -c ws://127.0.0.1:3000/ws
   ```

---

### Spotify Service Initialization Failed

**Symptoms:**

```
SpotifyPolling initialization failed: ...
```

**Solution:**

1. Check `.env.local` has required vars:

   ```bash
   grep SPOTIFY .env.local
   ```

2. Verify token file exists or is writable:

   ```bash
   ls -l logs/spotify_tokens.json
   mkdir -p logs
   ```

3. Check debug endpoint:

   ```bash
   curl http://127.0.0.1:3000/api/debug/auth-check | jq
   ```

4. Run automated verification:
   ```bash
   npm run verify:spotify
   ```

See [SPOTIFY_TROUBLESHOOTING.md](SPOTIFY_TROUBLESHOOTING.md) for detailed Spotify issues.

---

### Environment Variable Issues

**Symptoms:**

- Spotify not configured
- NextAuth errors
- Server binds to wrong address

**Solution:**

1. Verify `.env.local` exists in project root:

   ```bash
   ls -la .env.local
   ```

2. Check required variables are set:

   ```bash
   cat .env.local
   ```

   Required:

   ```
   SPOTIFY_CLIENT_ID=...
   SPOTIFY_CLIENT_SECRET=...
   NEXTAUTH_URL=http://127.0.0.1:3000
   NEXTAUTH_SECRET=...
   ```

3. Generate NEXTAUTH_SECRET if missing:

   ```bash
   openssl rand -base64 32
   ```

4. Restart server after changes:
   ```bash
   npm run pm2:stop && npm run dev
   ```

---

## Development Checklist

When starting fresh or after pulling changes:

- [ ] `npm install` - Install/update dependencies
- [ ] Check `.env.local` has all required secrets
- [ ] `npm run build:server` - Verify TypeScript compiles
- [ ] `lsof -i :3000` - Ensure port is available
- [ ] `npm run dev` - Start server
- [ ] Check logs for "Ready on http://127.0.0.1:3000"
- [ ] Check logs for "WebSocket Server listening"
- [ ] `npm run verify:spotify` - Verify Spotify integration
- [ ] Open http://127.0.0.1:3000 in browser

---

## Emergency Reset

If nothing works, try a complete reset:

```bash
# Stop all processes
npm run pm2:stop
pm2 delete all
pkill -f "node.*server"

# Clean build artifacts
rm -rf .next dist node_modules package-lock.json

# Reinstall
npm install

# Rebuild and start
npm run build:server
npm run dev
```

---

## Getting Help

If issues persist:

1. Check server logs: `npm run pm2:logs` or `tail -f /tmp/server.log`
2. Check browser console for client-side errors
3. Verify network requests in DevTools Network tab
4. Run automated checks: `npm run verify:spotify`
5. Review [.github/copilot-instructions.md](.github/copilot-instructions.md) for architecture details
6. Check [running_notes.md](running_notes.md) for recent changes
