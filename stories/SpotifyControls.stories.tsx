import type { Meta, StoryObj } from '@storybook/react';
import SpotifyControls from '@/app/client/control/components/SpotifyControls';
import { MockWebSocketProvider } from './decorators/MockWebSocketProvider';

// Mock useRouter
// Storybook Next.js addon should handle this, but explicit mock might be safer for specific behavior if needed.
// For now relying on default addon behavior.

const meta: Meta<typeof SpotifyControls> = {
  title: 'Control/SpotifyControls',
  component: SpotifyControls,
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

export const NoTrack: Story = {};

export const Playing: Story = {
  decorators: [
    (Story) => (
      <MockWebSocketProvider
        values={{
          spotifyData: {
            trackName: 'Bohemian Rhapsody',
            artist: 'Queen',
            isPlaying: true,
            devices: [
              { id: '1', name: 'MacBook Pro', is_active: true, type: 'Computer', volume_percent: 50, is_private_session: false, is_restricted: false },
              { id: '2', name: 'iPhone', is_active: false, type: 'Smartphone', volume_percent: 80, is_private_session: false, is_restricted: false },
            ],
          },
        }}
      >
        <Story />
      </MockWebSocketProvider>
    ),
  ],
};

export const Paused: Story = {
  decorators: [
    (Story) => (
      <MockWebSocketProvider
        values={{
          spotifyData: {
            trackName: 'Bohemian Rhapsody',
            artist: 'Queen',
            isPlaying: false,
            devices: [
                { id: '1', name: 'MacBook Pro', is_active: true, type: 'Computer', volume_percent: 50, is_private_session: false, is_restricted: false },
            ],
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
