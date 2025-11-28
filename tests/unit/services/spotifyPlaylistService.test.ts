import { getPresetPlaylists } from '../../../services/spotify-playlist-service'
import { presetPlaylists } from '../../../services/seed-data'

describe('Spotify Playlist Service', () => {
  it('should return the correct preset playlists', () => {
    const playlists = getPresetPlaylists()
    expect(playlists).toEqual(presetPlaylists)
    expect(playlists.length).toBeGreaterThan(0)
  })

  it('should have valid playlist structure', () => {
    const playlists = getPresetPlaylists()
    playlists.forEach((playlist) => {
      expect(playlist).toHaveProperty('id')
      expect(playlist).toHaveProperty('name')
      expect(playlist).toHaveProperty('uri')
      expect(playlist.uri).toMatch(/^spotify:playlist:/)
    })
  })
})
