import type { Meta, StoryObj } from '@storybook/react'
import HrmTiles from './HrmTiles'
import { WebSocketContext } from '@/context/WebSocketContext'
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any
}) => (
  <WebSocketContext.Provider value={value}>
    {children}
  </WebSocketContext.Provider>
)

const defaultContext = {
  hrmData: [],
  connectionStatus: 'Connected',
  activeAlerts: [],
  timerState: {},
  spotifyData: {},
  isConnected: true,
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
