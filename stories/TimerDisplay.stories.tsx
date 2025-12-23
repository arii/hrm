import type { Meta, StoryObj } from '@storybook/react'
import TimerDisplay from '@/components/TimerDisplay'
import { WebSocketContext } from '@/context/WebSocketContext'
import { AudioProvider } from '@/context/AudioContext'
import {
  mockWebSocketContext,
  mockTimerData,
} from './mocks/mockWebSocketContext'
import { TimerData } from '@/types/websocket'

const meta: Meta<typeof TimerDisplay> = {
  title: 'Components/TimerDisplay',
  component: TimerDisplay,
  decorators: [
    (Story, { args }: { args: { timerData?: TimerData } }) => (
      <WebSocketContext.Provider
        value={{
          ...mockWebSocketContext,
          timerData: args.timerData || mockWebSocketContext.timerData,
        }}
      >
        <AudioProvider>
          <Story />
        </AudioProvider>
      </WebSocketContext.Provider>
    ),
  ],
  parameters: {
    viewport: {
      defaultViewport: 'iphone6',
    },
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof TimerDisplay>

export const Active: Story = {
  args: {
    timerData: {
      ...mockTimerData,
      currentPhase: 'WORK',
      timeRemaining: 15,
      isRunning: true,
    },
  },
}

export const Paused: Story = {
  args: {
    timerData: {
      ...mockTimerData,
      currentPhase: 'WORK',
      timeRemaining: 10,
      isRunning: false,
    },
  },
}

export const Reset: Story = {
  args: {
    timerData: {
      ...mockTimerData,
      currentPhase: 'IDLE',
      timeRemaining: 0,
      isRunning: false,
    },
  },
}

export const ActiveDesktop: Story = {
  args: {
    ...Active.args,
  },
  parameters: {
    viewport: {
      defaultViewport: 'responsive',
    },
  },
}
