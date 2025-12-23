import type { Meta, StoryObj } from '@storybook/react'
import { SessionProvider } from 'next-auth/react'
import SpotifyDisplay from '@/components/SpotifyDisplay'
import { WebSocketContext } from '@/context/WebSocketContext'
import { mockWebSocketContext } from './mocks/mockWebSocketContext'
import { mockSession } from './mocks/mockSession'
import { handlers } from './mocks/handlers'

const meta: Meta<typeof SpotifyDisplay> = {
  title: 'Components/SpotifyDisplay',
  component: SpotifyDisplay,
  decorators: [
    (Story) => (
      <SessionProvider session={mockSession}>
        <WebSocketContext.Provider value={mockWebSocketContext}>
          <Story />
        </WebSocketContext.Provider>
      </SessionProvider>
    ),
  ],
  parameters: {
    msw: {
      handlers,
    },
    viewport: {
      defaultViewport: 'iphone6',
    },
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof SpotifyDisplay>

export const Playing: Story = {}

export const PlayingDesktop: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'responsive',
    },
  },
}
