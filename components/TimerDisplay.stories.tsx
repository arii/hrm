import type { Meta, StoryObj } from '@storybook/react'
import TimerDisplay from './TimerDisplay'
import {
  WebSocketContext,
  WebSocketContextType,
} from '@/context/WebSocketContext'

const meta: Meta<typeof TimerDisplay> = {
  title: 'Components/TimerDisplay',
  component: TimerDisplay,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <WebSocketContext.Provider
        value={
          {
            connectionStatus: 'Connected',
            hrmData: [],
            activeAlerts: [],
            timerData: {}, // Changed from timerState to match WebSocketContextType
            spotifyData: {},
            activeAlerts: [],
            spotifyServiceInitialized: true,
            sendData: () => {},
            connect: () => {},
            disconnect: () => {},
          } as unknown as WebSocketContextType
        }
      >
        <Story />
      </WebSocketContext.Provider>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof TimerDisplay>

export const Idle: Story = {
  args: {
    phase: 'IDLE',
    timeRemaining: 0,
    timeElapsed: 0,
    mode: 'TABATA',
  },
}

export const Prepare: Story = {
  args: {
    phase: 'PREPARE',
    timeRemaining: 10,
    timeElapsed: 0,
    mode: 'TABATA',
  },
}

export const TabataWork: Story = {
  args: {
    phase: 'WORK',
    timeRemaining: 15,
    timeElapsed: 5,
    mode: 'TABATA',
    workDuration: 20,
    restDuration: 10,
  },
}

export const TabataRest: Story = {
  args: {
    phase: 'REST',
    timeRemaining: 8,
    timeElapsed: 25,
    mode: 'TABATA',
    workDuration: 20,
    restDuration: 10,
  },
}

export const Stopwatch: Story = {
  args: {
    phase: 'RUNNING',
    timeRemaining: 0,
    timeElapsed: 125,
    mode: 'STOPWATCH',
  },
}
