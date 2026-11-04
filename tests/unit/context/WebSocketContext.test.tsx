/** @jest-environment jsdom */

import { useEffect } from 'react'
import { act, render } from '@testing-library/react'
import {
  WebSocketProvider,
  useHrmData,
  useSpotifyData,
  useTimerData,
  useWebSocketConnection,
} from '@/context/WebSocketContext'
import type { ServerMessage } from '@/types/websocket'

// Socket stub: the provider constructs it on mount. Never opens, so no
// heartbeat/reconnect timers run and dispatches below are the only updates.
class MockWs {
  static OPEN = 1
  readyState = 0
  send = jest.fn()
  close = jest.fn()
  onopen: ((event: unknown) => void) | null = null
  onclose: ((event: unknown) => void) | null = null
  onerror: ((event: unknown) => void) | null = null
  onmessage: ((event: unknown) => void) | null = null
  constructor(public url: string) {}
}

const timerPayload = {
  isRunning: true,
  currentPhase: 'WORK',
  timeRemaining: 20,
  timeElapsed: 0,
  caloriesBurned: 0,
  mode: 'TABATA',
  workDuration: 20,
  restDuration: 10,
  soundEventId: 0,
} as const

const countRenders = (hook: () => unknown, counter: { count: number }) => {
  const Probe = () => {
    hook()
    // No dep array: fires after every render, so this counts renders.
    useEffect(() => {
      counter.count += 1
    })
    return null
  }
  Probe.displayName = `Probe(${hook.name})`
  return Probe
}

describe('WebSocketProvider slice isolation', () => {
  const spotifyRenders = { count: 0 }
  const timerRenders = { count: 0 }
  const hrmRenders = { count: 0 }
  const connectionRenders = { count: 0 }
  const SpotifyProbe = countRenders(useSpotifyData, spotifyRenders)
  const TimerProbe = countRenders(useTimerData, timerRenders)
  const HrmProbe = countRenders(useHrmData, hrmRenders)
  const ConnectionProbe = countRenders(
    useWebSocketConnection,
    connectionRenders
  )

  const dispatch = (message: ServerMessage) => {
    const controls = (
      window as unknown as {
        __TEST_CONTROLS__?: { dispatch: (m: ServerMessage) => void }
      }
    ).__TEST_CONTROLS__
    if (!controls) throw new Error('TEST_CONTROLS not installed')
    act(() => {
      controls.dispatch(message)
    })
  }

  beforeEach(() => {
    spotifyRenders.count = 0
    timerRenders.count = 0
    hrmRenders.count = 0
    connectionRenders.count = 0
    ;(global as unknown as { WebSocket: unknown }).WebSocket = MockWs
    render(
      <WebSocketProvider serverUrl="ws://localhost:1">
        <SpotifyProbe />
        <TimerProbe />
        <HrmProbe />
        <ConnectionProbe />
      </WebSocketProvider>
    )
  })

  it('re-renders only timer subscribers on TIMER_UPDATE', () => {
    const before = {
      spotify: spotifyRenders.count,
      timer: timerRenders.count,
      hrm: hrmRenders.count,
      connection: connectionRenders.count,
    }
    dispatch({ type: 'TIMER_UPDATE', payload: { ...timerPayload } })
    expect(timerRenders.count).toBe(before.timer + 1)
    expect(spotifyRenders.count).toBe(before.spotify)
    expect(hrmRenders.count).toBe(before.hrm)
    expect(connectionRenders.count).toBe(before.connection)
  })

  it('re-renders only spotify subscribers on SPOTIFY_UPDATE', () => {
    const before = {
      spotify: spotifyRenders.count,
      timer: timerRenders.count,
      hrm: hrmRenders.count,
      connection: connectionRenders.count,
    }
    dispatch({
      type: 'SPOTIFY_UPDATE',
      payload: {
        devices: [],
        playback: {
          track: {
            id: 't1',
            name: 'Song',
            artist: 'Artist',
            albumName: '',
            albumArtUrl: '',
          },
          is_playing: true,
          volume_percent: 50,
          progress_ms: 0,
          isMuted: false,
        },
      },
    })
    expect(spotifyRenders.count).toBe(before.spotify + 1)
    expect(timerRenders.count).toBe(before.timer)
    expect(hrmRenders.count).toBe(before.hrm)
    expect(connectionRenders.count).toBe(before.connection)
  })

  it('re-renders only hrm subscribers on HRM_UPDATE', () => {
    const before = {
      spotify: spotifyRenders.count,
      timer: timerRenders.count,
      hrm: hrmRenders.count,
      connection: connectionRenders.count,
    }
    dispatch({
      type: 'HRM_UPDATE',
      payload: [
        {
          clientId: 'c1',
          value: 120,
          name: 'Test',
          age: 30,
          updatedAt: Date.now(),
        },
      ],
    })
    expect(hrmRenders.count).toBe(before.hrm + 1)
    expect(timerRenders.count).toBe(before.timer)
    expect(spotifyRenders.count).toBe(before.spotify)
    expect(connectionRenders.count).toBe(before.connection)
  })
})
