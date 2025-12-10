import { http, HttpResponse } from 'msw'

export const handlers = [
  // 1. Mock NextAuth Session
  http.get('/api/auth/session', () => {
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
  http.get('/api/users', () => {
    return HttpResponse.json({
      id: 'mock-user-id',
      name: 'Storybook Developer',
      maxHr: 195,
      theme: 'dark',
    })
  }),

  // 3. Mock Spotify Status (Generic)
  http.get('/api/spotify/status', () => {
    return HttpResponse.json({
      is_playing: false,
      item: null,
    })
  }),
]
