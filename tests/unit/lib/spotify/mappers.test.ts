/**
 * @jest-environment node
 */
import {
  firstImageUrl,
  mapSimplifiedPlaylistToSpotifyPlaylist,
} from '@/lib/spotify/mappers'
import type { SimplifiedPlaylist } from '@spotify/web-api-ts-sdk'

const basePlaylist = {
  id: 'abc',
  name: 'Test',
  uri: 'spotify:playlist:abc',
  description: 'desc',
  images: [{ url: 'http://img/1', height: 100, width: 100 }],
  tracks: { total: 42 },
  owner: { display_name: 'Owner', id: 'owner1' },
  public: true,
} as unknown as SimplifiedPlaylist

describe('spotify mappers', () => {
  describe('firstImageUrl', () => {
    it('returns the first image url', () => {
      expect(firstImageUrl([{ url: 'a' }, { url: 'b' }])).toBe('a')
    })

    it('returns null for missing or empty images', () => {
      expect(firstImageUrl(undefined)).toBeNull()
      expect(firstImageUrl(null)).toBeNull()
      expect(firstImageUrl([])).toBeNull()
    })
  })

  describe('mapSimplifiedPlaylistToSpotifyPlaylist', () => {
    it('maps all fields from a full playlist', () => {
      expect(mapSimplifiedPlaylistToSpotifyPlaylist(basePlaylist)).toEqual({
        id: 'abc',
        name: 'Test',
        uri: 'spotify:playlist:abc',
        description: 'desc',
        imageUrl: 'http://img/1',
        trackCount: 42,
        owner: 'Owner',
        public: true,
      })
    })

    it('falls back for sparse playlists', () => {
      const sparse = {
        ...basePlaylist,
        description: '',
        images: [],
        tracks: null,
        owner: { id: 'owner1' },
        public: null,
      } as unknown as SimplifiedPlaylist
      expect(mapSimplifiedPlaylistToSpotifyPlaylist(sparse)).toEqual({
        id: 'abc',
        name: 'Test',
        uri: 'spotify:playlist:abc',
        description: null,
        imageUrl: null,
        trackCount: 0,
        owner: 'owner1',
        public: false,
      })
    })

    it('falls back to Unknown owner', () => {
      const noOwner = {
        ...basePlaylist,
        owner: {},
      } as unknown as SimplifiedPlaylist
      expect(mapSimplifiedPlaylistToSpotifyPlaylist(noOwner).owner).toBe(
        'Unknown'
      )
    })
  })
})
