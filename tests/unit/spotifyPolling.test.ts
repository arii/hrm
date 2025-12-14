// @ts-nocheck
import { SpotifyPolling } from '../../../../services/spotifyPolling'
import { broadcast } from '../../../../utils/broadcast'

jest.mock('../../../../services/spotifyPolling')
jest.mock('../../../../utils/broadcast')

describe('SpotifyPolling', () => {
  it('should be defined', () => {
    expect(SpotifyPolling).toBeDefined()
  })

  it('should call broadcast', () => {
    expect(broadcast).not.toHaveBeenCalled()
  })
})
