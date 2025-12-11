import type { Meta, StoryObj } from '@storybook/react'
import TimerDisplay from './TimerDisplay'
import { WebSocketProvider } from '@/context/WebSocketContext'
import { fn } from '@storybook/test'

const MockWebSocketProvider = ({ children, status }) => (
  <WebSocketProvider value={{ connectionStatus: status, sendData: fn() }}>
    {children}
  </WebSocketProvider>
)

const meta = {
  title: 'Components/TimerDisplay',
  component: TimerDisplay,
  tags: ['autodocs'],
  decorators: [
    (Story, { args }) => (
      <MockWebSocketProvider status={args.connectionStatus || 'Connected'}>
        <Story />
      </MockWebSocketProvider>
    ),
  ],
  argTypes: {
    phase: {
      control: 'select',
      options: ['IDLE', 'PREPARE', 'WORK', 'REST', 'COOLDOWN', 'RUNNING'],
    },
    mode: {
      control: 'select',
      options: ['STOPWATCH', 'TABATA'],
    },
    timeRemaining: { control: 'number' },
    timeElapsed: { control: 'number' },
    workDuration: { control: 'number' },
    restDuration: { control: 'number' },
  },
} satisfies Meta<typeof TimerDisplay>

export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = {
  args: {
    phase: 'IDLE',
    mode: 'TABATA',
    timeRemaining: 0,
    timeElapsed: 0,
  },
}

export const Prepare: Story = {
  args: {
    phase: 'PREPARE',
    mode: 'TABATA',
    timeRemaining: 5,
    timeElapsed: 0,
  },
}

export const Work: Story = {
  args: {
    phase: 'WORK',
    mode: 'TABATA',
    timeRemaining: 15,
    timeElapsed: 0,
    workDuration: 20,
    restDuration: 10,
  },
}

export const Rest: Story = {
  args: {
    phase: 'REST',
    mode: 'TABATA',
    timeRemaining: 8,
    timeElapsed: 0,
    workDuration: 20,
    restDuration: 10,
  },
}

export const Cooldown: Story = {
  args: {
    phase: 'COOLDOWN',
    mode: 'TABATA',
    timeRemaining: 3,
    timeElapsed: 0,
  },
}

export const Stopwatch: Story = {
  args: {
    phase: 'RUNNING',
    mode: 'STOPWATCH',
    timeRemaining: 0,
    timeElapsed: 125, // 2 minutes 5 seconds
  },
}

export const Disconnected: Story = {
  args: {
    ...Idle.args,
    connectionStatus: 'Disconnected',
  },
}

export const Reconnecting: Story = {
  args: {
    ...Work.args,
    connectionStatus: 'Reconnecting...',
  },
}
