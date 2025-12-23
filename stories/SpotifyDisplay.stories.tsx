import type { Meta, StoryObj } from '@storybook/react'
import { SessionProvider } from 'next-auth/react'
import SpotifyDisplay from '@/components/SpotifyDisplay'
import { WebSocketContext } from '@/context/WebSocketContext'
import { mockWebSocketContext } from './mocks/mockWebSocketContext'
import { mockSession } from './mocks/mockSession'
import { handlers } from './mocks/handlers'
import { INITIAL_VIEWPORTS } from '@storybook/addon-viewport'

const meta: Meta<typeof SpotifyDisplay> = {
  title: 'Components/SpotifyDisplay',
  component: SpotifyDisplay,
  decorators: [
    (Story) => (
      <SessionProvider session={mockSession}>
        <WebSocketContext.Provider value={mockWebSocketContext}>
          <Story />
        </WebSocket-Context.Provider>
      </SessionProvider>
    ),
  ],
  parameters: {
    msw: {
      handlers,
    },
    viewport: {
      viewports: INITIAL_VIEWPORTS,
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
