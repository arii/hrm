import type { Meta, StoryObj } from '@storybook/react'
import TimerDisplay from '@/components/TimerDisplay'
import { WebSocketContext } from '@/context/WebSocketContext'
import { AudioContext } from '@/context/AudioContext'
import {
  mockWebSocketContext,
  mockTimerData,
} from './mocks/mockWebSocketContext'
import { mockAudioContext } from './mocks/mockAudioContext'
import { INITIAL_VIEWPORTS } from '@storybook/addon-viewport'

const meta: Meta<typeof TimerDisplay> = {
  title: 'Components/TimerDisplay',
  component: TimerDisplay,
  decorators: [
    (Story, { args }) => (
      <WebSocketContext.Provider
        value={{
          ...mockWebSocketContext,
          timerData: args.timerData || mockWebSocketContext.timerData,
        }}
      >
        <AudioContext.Provider value={mockAudioContext}>
          <Story />
        </AudioContext.Provider>
      </WebSocketContext.Provider>
    ),
  ],
  parameters: {
    viewport: {
      viewports: INITIAL_VIEWPORTS,
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
