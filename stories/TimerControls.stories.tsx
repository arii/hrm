import type { Meta, StoryObj } from '@storybook/react'
import TimerControls from '../app/client/control/components/TimerControls'
import { MockWebSocketProvider, defaultTimerData } from './utils'
import { TimerData } from '../types/websocket'

// Wrapper to allow controls to pass through to context
const TimerControlsWrapper = (args: any) => {
  return <TimerControls />
}

const meta: Meta<typeof TimerControls> = {
  title: 'Control/TimerControls',
  component: TimerControlsWrapper, // Use wrapper to avoid passing args to component as props
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    isRunning: { control: 'boolean' },
    mode: { control: 'radio', options: ['TABATA', 'STOPWATCH'] },
    currentPhase: {
      control: 'select',
      options: ['IDLE', 'PREPARE', 'WORK', 'REST', 'COOLDOWN', 'RUNNING']
    },
  } as any,
  decorators: [
    (Story, context) => {
      const timerData: TimerData = {
        ...defaultTimerData,
        isRunning: context.args.isRunning ?? defaultTimerData.isRunning,
        mode: context.args.mode ?? defaultTimerData.mode,
        currentPhase: context.args.currentPhase ?? defaultTimerData.currentPhase,
      }
      return (
        <MockWebSocketProvider timerData={timerData}>
          <Story />
        </MockWebSocketProvider>
      )
    },
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = {
  args: {
    isRunning: false,
    mode: 'TABATA',
    currentPhase: 'IDLE',
  } as any,
}

export const Running: Story = {
  args: {
    isRunning: true,
    mode: 'TABATA',
    currentPhase: 'WORK',
  } as any,
}

export const Stopwatch: Story = {
  args: {
    isRunning: false,
    mode: 'STOPWATCH',
    currentPhase: 'IDLE',
  } as any,
}
