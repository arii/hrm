import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HRM | Real-Time Heart Rate Monitor',
    short_name: 'HRM',
    description: 'Real-time heart rate monitoring dashboard',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/assets/cog.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/assets/cog.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
