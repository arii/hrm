import type { Meta, StoryObj } from '@storybook/react'
import SpotifyControls from '../app/client/control/components/SpotifyControls'
import { MockWebSocketProvider, defaultSpotifyData } from './utils'
import { SpotifyData } from '../types/websocket'

const SpotifyControlsWrapper = (args: any) => <SpotifyControls />

const meta: Meta<typeof SpotifyControls> = {
  title: 'Control/SpotifyControls',
  component: SpotifyControlsWrapper,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    trackName: { control: 'text' },
    artist: { control: 'text' },
    isPlaying: { control: 'boolean' },
    connectionStatus: { control: 'text' },
  } as any,
  decorators: [
    (Story, context) => {
      const spotifyData: SpotifyData = {
        ...defaultSpotifyData,
        trackName: context.args.trackName ?? defaultSpotifyData.trackName,
        artist: context.args.artist ?? defaultSpotifyData.artist,
        isPlaying: context.args.isPlaying ?? defaultSpotifyData.isPlaying,
        devices: [
            { id: '1', name: 'Web Player', is_active: true, is_private_session: false, is_restricted: false, type: 'Computer', volume_percent: 50 },
            { id: '2', name: 'Phone', is_active: false, is_private_session: false, is_restricted: false, type: 'Smartphone', volume_percent: 80 }
        ]
      }
      return (
        <MockWebSocketProvider
            spotifyData={spotifyData}
            connectionStatus={context.args.connectionStatus ?? 'Connected'}
        >
          <div style={{ width: 400 }}>
             <Story />
          </div>
        </MockWebSocketProvider>
      )
    },
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const Playing: Story = {
  args: {
    trackName: 'Test Song',
    artist: 'Test Artist',
    isPlaying: true,
    connectionStatus: 'Connected',
  } as any,
}

export const Paused: Story = {
  args: {
    trackName: 'Test Song',
    artist: 'Test Artist',
    isPlaying: false,
    connectionStatus: 'Connected',
  } as any,
}

export const NotConnected: Story = {
  args: {
    connectionStatus: 'Disconnected'
  } as any,
}
