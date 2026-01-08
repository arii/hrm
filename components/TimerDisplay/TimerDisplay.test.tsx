/**
 * @jest-environment jsdom
 */
import { WebSocketProvider } from '@/context/WebSocketContext'
import React from 'react'
import TimerDisplay from '../TimerDisplay'
import { assertNoA11yViolations } from '../../tests/utils/a11y'
import { AudioProvider } from '@/context/AudioContext'

// Mock the useAudio hook
jest.mock('@/hooks/useAudio', () => ({
  useAudio: () => ({
    initializeAudio: jest.fn(),
    playLongBeep: jest.fn(),
    playShortBeep: jest.fn(),
    volume: 1,
    setVolume: jest.fn(),
    muted: false,
    toggleMute: jest.fn(),
  }),
}))

describe('<TimerDisplay /> Accessibility', () => {
  it('should have no accessibility violations in default state', async () => {
    await assertNoA11yViolations(
      <WebSocketProvider>
        <AudioProvider>
          <TimerDisplay />
        </AudioProvider>
      </WebSocketProvider>
    )
  })
})
