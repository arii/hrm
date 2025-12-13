import type { Meta, StoryObj } from '@storybook/react'
import PlaylistSelector from './PlaylistSelector'
import { http, HttpResponse } from 'msw'

const meta: Meta<typeof PlaylistSelector> = {
  title: 'Components/Spotify/PlaylistSelector',
  component: PlaylistSelector,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onPlaylistSelected: { action: 'playlist selected' },
    onPlaylistPlay: { action: 'playlist play' },
  },
}

export default meta
type Story = StoryObj<typeof PlaylistSelector>

const mockPlaylists = {
  presetPlaylists: [
    {
      uri: 'spotify:playlist:preset1',
      name: 'Preset Power',
      imageUrl: 'https://placehold.co/48x48',
      trackCount: 20,
      owner: 'System',
    },
  ],
  userPlaylists: [
    {
      uri: 'spotify:playlist:user1',
      name: 'My Gym Mix',
      imageUrl: 'https://placehold.co/48x48',
      trackCount: 45,
      owner: 'User',
    },
  ],
}

const mockSearchResults = {
  items: [
    {
      uri: 'spotify:playlist:search1',
      name: 'Search Result Hits',
      imageUrl: 'https://placehold.co/48x48',
      trackCount: 100,
      owner: 'Spotify',
      isSearchResult: true,
    },
  ],
}

export const Default: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/spotify/playlists', () => {
          return HttpResponse.json(mockPlaylists)
        }),
        http.get('/api/spotify/playlists/search', () => {
          return HttpResponse.json(mockSearchResults)
        }),
      ],
    },
  },
  args: {},
}

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/spotify/playlists', async () => {
          await new Promise((resolve) => setTimeout(resolve, 'infinite'))
          return HttpResponse.json({})
        }),
      ],
    },
  },
  args: {},
}

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/spotify/playlists', () => {
          return HttpResponse.json({ presetPlaylists: [], userPlaylists: [] })
        }),
      ],
    },
  },
  args: {},
}

export const ErrorState: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/spotify/playlists', () => {
          return new HttpResponse(null, { status: 500 })
        }),
      ],
    },
  },
  args: {},
}
