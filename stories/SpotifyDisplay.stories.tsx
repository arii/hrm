import type { Meta, StoryObj } from '@storybook/react'
import { SessionProvider } from 'next-auth/react'
import SpotifyDisplay from '@/components/SpotifyDisplay'
import { MockWebSocketProvider } from './mocks/MockWebSocketProvider'
import {
  mockHrmData,
  mockSpotifyData,
  mockSpotifyDataNoActivePlayback,
  mockTimerData,
} from './mocks/mockWebSocketContext'
import { mockSession } from './mocks/mockSession'
import { handlers } from './mocks/handlers'

const baseState = {
  spotifyData: mockSpotifyData,
  timerData: mockTimerData,
  hrmData: [mockHrmData],
}

const meta: Meta<typeof SpotifyDisplay> = {
  title: 'Components/SpotifyDisplay',
  component: SpotifyDisplay,
  decorators: [
    (Story) => (
      <SessionProvider session={mockSession}>
        <MockWebSocketProvider initialState={baseState}>
          <Story />
        </MockWebSocketProvider>
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

export const NoActivePlayback: Story = {
  decorators: [
    (Story) => (
      <SessionProvider session={mockSession}>
        <MockWebSocketProvider
          initialState={{
            ...baseState,
            spotifyData: mockSpotifyDataNoActivePlayback,
          }}
        >
          <Story />
        </MockWebSocketProvider>
      </SessionProvider>
    ),
  ],
}
