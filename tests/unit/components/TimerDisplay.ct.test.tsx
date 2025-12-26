import React from 'react'
import { test, expect } from '@playwright/experimental-ct-react'
import TimerDisplay from '../../../components/TimerDisplay'
import { WebSocketProvider } from '../../../context/WebSocketContext'
import { AudioProvider } from '../../../context/AudioContext'

const INITIAL_STATE = {
  hrmData: [],
  timerData: {
    isRunning: false,
    currentPhase: 'IDLE',
    timeRemaining: 30,
    timeElapsed: 0,
    caloriesBurned: 0,
    mode: 'TABATA',
    workDuration: 30,
    restDuration: 10,
    soundEventId: 0,
    targetTime: 0,
  },
  spotifyData: {
    trackId: null,
    trackName: 'Awaiting Login...',
    artist: '',
    albumName: '',
    albumArtUrl: '',
    isPlaying: false,
    devices: [],
    volume: 70,
    isMuted: false,
  },
  activeAlerts: [],
  spotifyServiceInitialized: true,
}

test.describe.skip('TimerDisplay Fast Lane', () => {
  test('displays WORK phase immediately on WebSocket message', async ({
    mount,
    page,
  }) => {
    await page.route('ws://localhost:3001/ws', async (route) => {
      const ws = await route.handle()
      ws.on('framereceived', async (frame) => {
        const message = JSON.parse(frame.payload.toString())
        if (message.type === 'GET_STATE') {
          ws.send(
            JSON.stringify({ type: 'INITIAL_STATE', payload: INITIAL_STATE })
          )
          ws.send(
            JSON.stringify({
              type: 'TIMER_UPDATE',
              payload: {
                currentPhase: 'WORK',
                timeRemaining: 20,
                isRunning: true,
              },
            })
          )
        }
      })
    })

    const component = await mount(
      <WebSocketProvider serverUrl="ws://localhost:3001/ws">
        <AudioProvider>
          <TimerDisplay />
        </AudioProvider>
      </WebSocketProvider>
    )

    await expect(component.locator('[data-testid="timer-phase"]')).toHaveText(
      'WORK',
      { timeout: 10000 }
    )
    await expect(
      component.locator('[data-testid="timer-countdown"]')
    ).toHaveText('00:20')
  })
})
