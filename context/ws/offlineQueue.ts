import type { ClientCommandMessage } from '../../types/websocket'

// Offline action queue: commands sent while the socket is down are kept in
// memory and in localStorage, then replayed when the connection opens.

const STORAGE_KEY = 'pendingActions'

// Called once from an effect guarded by `typeof window !== 'undefined'`.
// Kept unguarded on JSON.parse to match the original behavior exactly.
export const loadPendingActions = (): ClientCommandMessage[] => {
  const savedActions = localStorage.getItem(STORAGE_KEY)
  if (!savedActions) return []
  return JSON.parse(savedActions) as ClientCommandMessage[]
}

export const persistPendingActions = (
  actions: ClientCommandMessage[]
): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(actions))
}

export const clearPendingActions = (): void => {
  localStorage.setItem(STORAGE_KEY, '[]')
}

// Replays queued actions over an open socket and returns the emptied
// queue (the caller owns the ref, so it assigns the result back).
export const flushPendingActions = (
  ws: WebSocket,
  actions: ClientCommandMessage[]
): ClientCommandMessage[] => {
  actions.forEach((action) => {
    ws.send(JSON.stringify(action))
  })
  return []
}
