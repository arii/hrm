This document defines specialized review rules that are dynamically injected into the Gemini code review prompt based on the files changed in a pull request. This allows for a more focused and context-aware review process.

### ⚡ Real-Time & WebSocket Focus
**Patterns:** `server.ts`, `utils/socketManager.ts`, `lib/websocket.ts`, `services/tabataTimer.ts`
- **Memory Leaks**: Scrutinize event listener attachments and cleanups. Ensure every `on` has a corresponding `off`, especially in connection setup and teardown logic.
- **Race Conditions**: Analyze the sequence of asynchronous operations. Look for potential race conditions in client-to-server state synchronization, especially where multiple clients can modify the same state concurrently.
- **Connection Management**: Verify WebSocket connection heartbeats, timeout handling, and reconnection logic. Ensure the server gracefully handles abrupt client disconnections.
- **State Integrity**: Validate that all state mutations are performed through well-defined, atomic operations to prevent inconsistent or corrupted state.

### 🔐 Authentication & Session Focus
**Patterns:** `lib/auth.ts`, `app/api/auth/`, `hooks/useSpotifyAuth.ts`, `services/spotifyTokenManager.ts`
- **Token Handling**: Validate session token expiration handling, especially in the context of long-running WebSocket connections. Ensure that tokens are securely refreshed and stored.
- **Provider Configuration**: Ensure NextAuth.js providers are correctly and securely configured for token delivery, especially regarding callback URLs and scope permissions.
- **Secure Storage**: Verify that sensitive tokens or user data are stored securely, using HttpOnly cookies where appropriate and avoiding exposure on the client-side.
- **Authorization Logic**: Check that all sensitive endpoints and WebSocket messages properly authorize the user and their permissions before processing requests.
