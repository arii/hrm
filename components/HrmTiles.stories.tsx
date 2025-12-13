import type { Meta, StoryObj } from '@storybook/react'
import HrmTiles from './HrmTiles'
import {
  WebSocketContext,
  WebSocketContextType,
} from '@/context/WebSocketContext'
import Grid from '@mui/material/Grid2'
import { ReactNode } from 'react'

const meta: Meta<typeof HrmTiles> = {
  title: 'Components/HrmTiles',
  component: HrmTiles,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <Grid container spacing={2}>
        <Story />
      </Grid>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof HrmTiles>

// Mock WebSocket Context Helper

const MockWebSocketProvider = ({
  children,
  value,
}: {
  children: ReactNode
  value: Partial<WebSocketContextType>
}) => (
  <WebSocketContext.Provider value={value as WebSocketContextType}>
    {children}
  </WebSocketContext.Provider>
)

const defaultContext: Partial<WebSocketContextType> = {
  hrmData: [],
  connectionStatus: 'Connected',
  activeAlerts: [],
  timerData: {
    isRunning: false,
    currentPhase: 'IDLE',
    timeRemaining: 0,
    timeElapsed: 0,
    mode: 'TABATA',
    workDuration: 30,
    restDuration: 10,
    soundEventId: 0,
  },
  spotifyData: {
    trackName: 'Awaiting Login...',
    artist: '',
    isPlaying: false,
    devices: [],
  },
}

export const Loading: Story = {
  decorators: [
    (Story) => (
      <MockWebSocketProvider
        value={{ ...defaultContext, connectionStatus: 'Connecting...' }}
      >
        <Story />
      </MockWebSocketProvider>
    ),
  ],
  args: {},
}

export const Empty: Story = {
  decorators: [
    (Story) => (
      <MockWebSocketProvider value={{ ...defaultContext, hrmData: [] }}>
        <Story />
      </MockWebSocketProvider>
    ),
  ],
  args: {},
}

export const ActiveUsers: Story = {
  decorators: [
    (Story) => (
      <MockWebSocketProvider
        value={{
          ...defaultContext,
          hrmData: [
            { clientId: '1', name: 'User A', value: 120, maxHr: 190 },
            { clientId: '2', name: 'User B', value: 150, maxHr: 190 },
            { clientId: '3', name: 'User C', value: 180, maxHr: 190 },
          ],
        }}
      >
        <Story />
      </MockWebSocketProvider>
    ),
  ],
  args: {},
}

export const WithAlerts: Story = {
  decorators: [
    (Story) => (
      <MockWebSocketProvider
        value={{
          ...defaultContext,
          hrmData: [{ clientId: '1', name: 'User A', value: 40, maxHr: 190 }],
          activeAlerts: [
            { clientId: '1', code: 'BAD_PLACEMENT', message: 'Check Sensor' },
          ],
        }}
      >
        <Story />
      </MockWebSocketProvider>
    ),
  ],
  args: {},
}
