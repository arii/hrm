// File: tests/unit/mocks/spotifyService.ts

import { SpotifyService } from '../../../services/spotifyPolling'

export class MockSpotifyService implements SpotifyService {
  play = jest.fn()
  pause = jest.fn()
  next = jest.fn()
  previous = jest.fn()
  transferPlayback = jest.fn()
  setVolume = jest.fn()
  getSpotifyState = jest.fn().mockReturnValue({
    trackName: 'Mock Track',
    artist: 'Mock Artist',
    isPlaying: false,
  })

  constructor() {
    console.log('MockSpotifyService initialized')
  }
}
