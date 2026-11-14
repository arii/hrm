/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
import {
  clearPendingActions,
  flushPendingActions,
  loadPendingActions,
  persistPendingActions,
} from '@/context/ws/offlineQueue'
import type { ClientCommandMessage } from '@/types/websocket'

describe('offlineQueue', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('loadPendingActions', () => {
    it('returns an empty queue when nothing is stored', () => {
      expect(loadPendingActions()).toEqual([])
    })

    it('restores actions persisted by a previous session', () => {
      const actions: ClientCommandMessage[] = [
        { type: 'TIMER_START' },
        { type: 'TIMER_STOP' },
      ]
      localStorage.setItem('pendingActions', JSON.stringify(actions))
      expect(loadPendingActions()).toEqual(actions)
    })
  })

  describe('persistPendingActions', () => {
    it('writes the queue to localStorage', () => {
      const actions: ClientCommandMessage[] = [{ type: 'TIMER_START' }]
      persistPendingActions(actions)
      expect(localStorage.getItem('pendingActions')).toBe(
        JSON.stringify(actions)
      )
      expect(loadPendingActions()).toEqual(actions)
    })
  })

  describe('clearPendingActions', () => {
    it('empties the stored queue', () => {
      persistPendingActions([{ type: 'TIMER_START' }])
      clearPendingActions()
      expect(loadPendingActions()).toEqual([])
    })
  })

  describe('flushPendingActions', () => {
    it('replays every queued action over the socket and returns an empty queue', () => {
      const sent: string[] = []
      const ws = {
        send: (data: string) => sent.push(data),
      } as unknown as WebSocket
      const actions: ClientCommandMessage[] = [
        { type: 'TIMER_START' },
        { type: 'TIMER_STOP' },
      ]

      const remaining = flushPendingActions(ws, actions)

      expect(remaining).toEqual([])
      expect(sent).toEqual([
        JSON.stringify({ type: 'TIMER_START' }),
        JSON.stringify({ type: 'TIMER_STOP' }),
      ])
    })
  })
})
