import { http, HttpResponse } from 'msw'
import {
  API_AUTH_SESSION,
  API_SPOTIFY_ACCESS_TOKEN,
  API_SPOTIFY_DEVICES,
  API_USERS,
} from '@/constants/apiEndpoints'

const spotifyDevices = [
  {
    id: '1',
    is_active: true,
    is_private_session: false,
    is_restricted: false,
    name: 'Test Device 1',
    type: 'Computer',
    volume_percent: 50,
    supports_volume: true,
  },
  {
    id: '2',
    is_active: false,
    is_private_session: false,
    is_restricted: false,
    name: 'Test Device 2',
    type: 'Speaker',
    volume_percent: 75,
    supports_volume: true,
  },
]

export const handlers = [
  // 1. Mock NextAuth Session
  http.get(API_AUTH_SESSION, () => {
    return HttpResponse.json({
      user: {
        name: 'Storybook Developer',
        email: 'dev@hrm.app',
        image: 'https://via.placeholder.com/150',
      },
      expires: new Date(Date.now() + 86400 * 1000).toISOString(),
    })
  }),

  // 2. Mock User Profile/Settings
  http.get(API_USERS, () => {
    return HttpResponse.json({
      id: 'mock-user-id',
      name: 'Storybook Developer',
      maxHr: 195,
      theme: 'dark',
    })
  }),

  // 3. Mock Spotify Devices
  http.get(API_SPOTIFY_DEVICES, () => {
    return HttpResponse.json(spotifyDevices)
  }),

  // 4. Mock Spotify Access Token
  http.get(API_SPOTIFY_ACCESS_TOKEN, () => {
    return HttpResponse.json({
      accessToken: 'mock-access-token',
      expiresIn: 3600,
    })
  }),
]
