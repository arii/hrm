// @ts-nocheck
import { TabataTimer } from '../../../../services/tabataTimer'
import { SpotifyPolling } from '../../../../services/spotifyPolling'

jest.mock('../../../../services/spotifyPolling')

describe('TabataTimer', () => {
  it('should be defined', () => {
    expect(TabataTimer).toBeDefined()
  })
})

describe('SpotifyPolling', () => {
  it('should be defined', () => {
    expect(SpotifyPolling).toBeDefined()
  })
})
