// services/seedData.ts

export interface SeedPlaylist {
  name: string
  uri: string
}

export const presetPlaylists: SeedPlaylist[] = [
  {
    name: 'Lo-Fi Beats',
    uri: 'spotify:playlist:37i9dQZF1DWWQRwui02Gu5',
  },
  {
    name: 'Chill Hits',
    uri: 'spotify:playlist:37i9dQZF1DX4WYpdgoIcn6',
  },
  {
    name: 'Rock Classics',
    uri: 'spotify:playlist:37i9dQZF1DWXRqgorJj26U',
  },
]
