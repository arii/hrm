import type { Meta, StoryObj } from '@storybook/react'
import SpotifyDisplay from './SpotifyDisplay'
import { WebSocketContext } from '@/context/WebSocketContext'
import { SessionProvider } from 'next-auth/react'

const meta: Meta<typeof SpotifyDisplay> = {
  title: 'Components/SpotifyDisplay',
  component: SpotifyDisplay,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
        <SessionProvider session={null}>
            <Story />
        </SessionProvider>
    )
  ]
}

export default meta
type Story = StoryObj<typeof SpotifyDisplay>

const mockWebSocketValue = {
    spotifyData: {
        isPlaying: false,
        trackName: 'Test Track',
        artist: 'Test Artist',
        albumArt: '',
        progressMs: 0,
        durationMs: 1000,
    },
    sendData: () => {},
    connectionStatus: 'Connected'
}

export const Unauthenticated: Story = {
    decorators: [
        (Story) => (
            <SessionProvider session={null}>
                <WebSocketContext.Provider value={mockWebSocketValue as any}>
                    <Story />
                </WebSocketContext.Provider>
            </SessionProvider>
        ),
    ],
    args: {},
}

export const Authenticated: Story = {
    decorators: [
        (Story) => (
            <SessionProvider session={{ user: { name: 'Test User' }, expires: '9999999999' }}>
                <WebSocketContext.Provider value={mockWebSocketValue as any}>
                    <Story />
                </WebSocketContext.Provider>
            </SessionProvider>
        ),
    ],
    args: {},
}

export const Playing: Story = {
    decorators: [
        (Story) => (
            <SessionProvider session={{ user: { name: 'Test User' }, expires: '9999999999' }}>
                <WebSocketContext.Provider value={{
                    ...mockWebSocketValue,
                    spotifyData: { ...mockWebSocketValue.spotifyData, isPlaying: true }
                } as any}>
                    <Story />
                </WebSocketContext.Provider>
            </SessionProvider>
        ),
    ],
    args: {},
}
