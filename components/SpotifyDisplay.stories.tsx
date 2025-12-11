import type { Meta, StoryObj } from '@storybook/react'
import { SessionProvider } from 'next-auth/react'
import SpotifyDisplay from './SpotifyDisplay'
import { WebSocketProvider } from '@/context/WebSocketContext'
import { fn } from '@storybook/test'

// Mock Session for Storybook
const MockSessionProvider = ({ children, session }) => (
  <SessionProvider session={session} refetchInterval={0}>
    {children}
  </SessionProvider>
)

const MockWebSocketProvider = ({ children, spotifyData }) => (
  <WebSocketProvider
    value={{
      spotifyData,
      sendData: fn(),
      connectionStatus: 'Connected',
    }}
  >
    {children}
  </WebSocketProvider>
)

const meta = {
  title: 'Components/SpotifyDisplay',
  component: SpotifyDisplay,
  tags: ['autodocs'],
  decorators: [
    (Story, { args }) => (
      <MockSessionProvider session={args.session}>
        <MockWebSocketProvider spotifyData={args.spotifyData}>
          <Story />
        </MockWebSocketProvider>
      </MockSessionProvider>
    ),
  ],
  parameters: {
    // Mock Next.js router
    nextjs: {
      appDirectory: true,
    },
    // Mock custom hooks used by SpotifyDisplay
    imports: {
      '@/hooks/useSpotifyWebPlayback': {
        default: () => ({
          player: null,
          isReady: false,
          deviceId: null,
          isAuthenticated: false,
        }),
      },
      '@/hooks/useSpotifyRemoteExecution': {
        useSpotifyRemoteExecution: fn(),
      },
      '@/hooks/useVolumePreference': {
        default: () => ({
          volume: 50,
          setVolume: fn(),
          muted: false,
          toggleMute: fn(),
        }),
        clampVolume: (v) => Math.min(100, Math.max(0, v)),
      },
    },
  },
} satisfies Meta<typeof SpotifyDisplay>

export default meta
type Story = StoryObj<typeof meta>

export const LoggedOut: Story = {
  args: {
    session: null,
    spotifyData: {},
  },
}

export const LoggedInNoPlayback: Story = {
  args: {
    session: {
      expires: '1',
      user: { email: 'a@b.com', name: 'Test User', image: '' },
      accessToken: 'test-token',
    },
    spotifyData: {
      trackName: 'Awaiting Login...',
      artist: '',
      isPlaying: false,
    },
  },
}

export const Playing: Story = {
  args: {
    ...LoggedInNoPlayback.args,
    spotifyData: {
      trackName: 'Bohemian Rhapsody',
      artist: 'Queen',
      isPlaying: true,
    },
  },
}

export const Paused: Story = {
  args: {
    ...Playing.args,
    spotifyData: {
      ...Playing.args.spotifyData,
      isPlaying: false,
    },
  },
}

export const LongTrackName: Story = {
  args: {
    ...Playing.args,
    spotifyData: {
      trackName:
        'The Most Unbelievably Long Song Title Ever Heard In The History Of Music',
      artist: 'A Very Wordy Artist Name',
      isPlaying: true,
    },
  },
}
