// File: tests/test-data/spotify-data-factory.ts
import { Playlist, Track } from '@spotify/web-api-ts-sdk'

/**
 * Creates a mock Spotify Track object.
 *
 * @param overrides - Partial track data to override the defaults.
 * @returns A mock Track object.
 */
export const createSpotifyTrack = (overrides: Partial<Track> = {}): Track => {
  const defaultTrack: Track = {
    album: {
      album_group: 'album',
      album_type: 'album',
      artists: [
        {
          external_urls: {
            spotify: 'https://open.spotify.com/artist/06HL4z0CvFAxyc27GXpf02',
          },
          href: 'https://api.spotify.com/v1/artists/06HL4z0CvFAxyc27GXpf02',
          id: '06HL4z0CvFAxyc27GXpf02',
          name: 'Taylor Swift',
          type: 'artist',
          uri: 'spotify:artist:06HL4z0CvFAxyc27GXpf02',
        },
      ],
      available_markets: ['US'],
      copyrights: [],
      external_ids: { isrc: 'USUG11901208' },
      external_urls: {
        spotify: 'https://open.spotify.com/album/6kZ42qRrzov54LcAk4onW9',
      },
      href: 'https://api.spotify.com/v1/albums/6kZ42qRrzov54LcAk4onW9',
      id: '6kZ42qRrzov54LcAk4onW9',
      images: [
        {
          url: 'https://i.scdn.co/image/ab67616d0000b273e787cffec20aa2a396a61647',
          height: 640,
          width: 640,
        },
        {
          url: 'https://i.scdn.co/image/ab67616d00001e02e787cffec20aa2a396a61647',
          height: 300,
          width: 300,
        },
        {
          url: 'https://i.scdn.co/image/ab67616d00004851e787cffec20aa2a396a61647',
          height: 64,
          width: 64,
        },
      ],
      name: 'Lover',
      release_date: '2019-08-23',
      release_date_precision: 'day',
      restrictions: { reason: 'market' },
      total_tracks: 18,
      type: 'album',
      uri: 'spotify:album:6kZ42qRrzov54LcAk4onW9',
    },
    artists: [
      {
        external_urls: {
          spotify: 'https://open.spotify.com/artist/06HL4z0CvFAxyc27GXpf02',
        },
        href: 'https://api.spotify.com/v1/artists/06HL4z0CvFAxyc27GXpf02',
        id: '06HL4z0CvFAxyc27GXpf02',
        name: 'Taylor Swift',
        type: 'artist',
        uri: 'spotify:artist:06HL4z0CvFAxyc27GXpf02',
      },
    ],
    disc_number: 1,
    duration_ms: 231000,
    explicit: false,
    external_ids: { isrc: 'USUG11901208' },
    external_urls: {
      spotify: 'https://open.spotify.com/track/1dGr1c8CrMLDpV6mPbImSI',
    },
    href: 'https://api.spotify.com/v1/tracks/1dGr1c8CrMLDpV6mPbImSI',
    id: '1dGr1c8CrMLDpV6mPbImSI',
    is_local: false,
    is_playable: true,
    name: 'Cruel Summer',
    popularity: 90,
    preview_url:
      'https://p.scdn.co/mp3-preview/e4a8b1b3b1e3b1e3b1e3b1e3b1e3b1e3b1e3b1e3',
    track_number: 2,
    type: 'track',
    uri: 'spotify:track:1dGr1c8CrMLDpV6mPbImSI',
  }

  return { ...defaultTrack, ...overrides }
}

/**
 * Creates a mock Spotify Playlist object.
 *
 * @param overrides - Partial playlist data to override the defaults.
 * @returns A mock Playlist object.
 */
export const createSpotifyPlaylist = (
  overrides: Partial<Playlist> = {}
): Playlist => {
  const defaultPlaylist: Playlist = {
    collaborative: false,
    description: 'This is a mock playlist.',
    external_urls: {
      spotify: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    },
    followers: { href: null, total: 100 },
    href: 'https://api.spotify.com/v1/playlists/37i9dQZF1DXcBWIGoYBM5M',
    id: '37i9dQZF1DXcBWIGoYBM5M',
    images: [
      {
        url: 'https://i.scdn.co/image/ab67706f00000002aa9072b22f3aa2d86c75de81',
        height: 640,
        width: 640,
      },
    ],
    name: "Today's Top Hits",
    owner: {
      display_name: 'Spotify',
      external_urls: { spotify: 'https://open.spotify.com/user/spotify' },
      href: 'https://api.spotify.com/v1/users/spotify',
      id: 'spotify',
      type: 'user',
      uri: 'spotify:user:spotify',
    },
    public: true,
    snapshot_id: 'snapshot-id-123',
    tracks: {
      href: 'https://api.spotify.com/v1/playlists/37i9dQZF1DXcBWIGoYBM5M/tracks',
      items: [
        {
          added_at: '2023-01-01T00:00:00Z',
          added_by: {
            id: 'spotify',
            type: 'user',
            uri: 'spotify:user:spotify',
          },
          is_local: false,
          track: createSpotifyTrack(),
        },
      ],
      limit: 100,
      next: null,
      offset: 0,
      previous: null,
      total: 1,
    },
    type: 'playlist',
    uri: 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M',
  }

  return { ...defaultPlaylist, ...overrides }
}
