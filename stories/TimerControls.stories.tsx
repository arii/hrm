import type { Meta, StoryObj } from '@storybook/react';
import TimerControls from '@/app/client/control/components/TimerControls';
import { MockWebSocketProvider } from './decorators/MockWebSocketProvider';

const meta: Meta<typeof TimerControls> = {
  title: 'Control/TimerControls',
  component: TimerControls,
  decorators: [
    (Story) => (
      <MockWebSocketProvider>
        <Story />
      </MockWebSocketProvider>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Running: Story = {
  decorators: [
    (Story) => (
      <MockWebSocketProvider
        values={{
          timerData: {
            isRunning: true,
            currentPhase: 'WORK',
            timeRemaining: 15,
            timeElapsed: 5,
            mode: 'TABATA',
            workDuration: 20,
            restDuration: 10,
            soundEventId: 0,
          },
        }}
      >
        <Story />
      </MockWebSocketProvider>
    ),
  ],
};

export const Disconnected: Story = {
  decorators: [
    (Story) => (
      <MockWebSocketProvider
        values={{
          connectionStatus: 'Disconnected',
        }}
      >
        <Story />
      </MockWebSocketProvider>
    ),
  ],
};
