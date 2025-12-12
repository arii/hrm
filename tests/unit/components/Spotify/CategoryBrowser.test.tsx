/** @jest-environment jsdom */

import 'whatwg-fetch'
import { TextEncoder, TextDecoder } from 'util'
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder as typeof global.TextDecoder

import CategoryBrowser from '@/components/Spotify/CategoryBrowser'
import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get('/api/spotify/categories', (req, res, ctx) => {
    return res(
      ctx.json({
        categories: [{ id: 'workout', name: 'Workout' }],
      })
    )
  }),
  rest.get('/api/spotify/categories/workout/playlists', (req, res, ctx) => {
    return res(
      ctx.json({
        playlists: [
          {
            id: '1',
            name: 'Workout Playlist',
            uri: 'spotify:playlist:1',
          },
        ],
      })
    )
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('CategoryBrowser', () => {
  it('should render categories and playlists', async () => {
    const onPlaylistSelected = jest.fn()
    const onPlaylistPlay = jest.fn()

    render(
      <CategoryBrowser
        onPlaylistSelected={onPlaylistSelected}
        onPlaylistPlay={onPlaylistPlay}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Workout')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Workout'))

    await waitFor(() => {
      expect(screen.getByText('Workout Playlist')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Workout Playlist'))
    expect(onPlaylistSelected).toHaveBeenCalledWith('spotify:playlist:1')

    await userEvent.click(screen.getByLabelText('play'))
    expect(onPlaylistPlay).toHaveBeenCalledWith('spotify:playlist:1')
  })
})
