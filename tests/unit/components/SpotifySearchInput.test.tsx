/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import SpotifySearchInput from '@/components/SpotifySearchInput'

jest.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar: jest.fn() }),
}))

describe('SpotifySearchInput', () => {
  const sameNameTracks = [
    {
      id: 'track-id-1',
      name: 'Eye of the Tiger',
      artists: [{ name: 'Survivor' }],
      album: { name: 'Eye Of The Tiger', images: [] },
      uri: 'spotify:track:1',
    },
    {
      id: 'track-id-2',
      name: 'Eye of the Tiger',
      artists: [{ name: 'Survivor' }],
      album: { name: 'Rocky IV', images: [] },
      uri: 'spotify:track:2',
    },
  ]

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tracks: { items: sameNameTracks } }),
    }) as unknown as typeof fetch
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders same-name tracks without duplicate React key warnings', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    render(<SpotifySearchInput onTrackSelect={jest.fn()} />)

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'Eye of the Tiger' },
    })

    const options = await screen.findAllByText('Eye of the Tiger', undefined, {
      timeout: 3000,
    })
    expect(options).toHaveLength(2)

    const keyWarnings = consoleSpy.mock.calls.filter((args) =>
      String(args[0]).includes('same key')
    )
    expect(keyWarnings).toHaveLength(0)
  })
})
