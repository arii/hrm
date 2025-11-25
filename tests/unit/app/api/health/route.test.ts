// tests/unit/app/api/health/route.test.ts
/** @jest-environment node */

import { GET } from '@/app/api/health/route'
import {
  spotifyServiceInstance,
  tabataServiceInstance,
  wssInstance,
} from '@/utils/socketManager'
import { NextRequest } from 'next/server'

// Mock the services
jest.mock('@/utils/socketManager', () => ({
  spotifyServiceInstance: {
    isReady: jest.fn(),
  },
  tabataServiceInstance: {},
  wssInstance: {
    clients: {
      size: 0,
    },
  },
}))

describe('API Route: /api/health', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('/api/health/live', () => {
    it('should return 200 OK with status "live"', async () => {
      const req = new NextRequest('http://localhost/api/health/live')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('live')
    })
  })

  describe('/api/health/ready', () => {
    it('should return 200 OK with status "ready" when all services are healthy', async () => {
      ;(spotifyServiceInstance.isReady as jest.Mock).mockReturnValue(true)
      Object.defineProperty(wssInstance.clients, 'size', {
        value: 1,
        configurable: true,
      })

      const req = new NextRequest('http://localhost/api/health/ready')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('ready')
      expect(data.services.spotify.ready).toBe(true)
      expect(data.services.tabataTimer.ready).toBe(true)
      expect(data.services.websocket.ready).toBe(true)
      expect(data.services.websocket.connections).toBe(1)
    })

    it('should return 503 Service Unavailable with status "unready" when Spotify service is not ready', async () => {
      ;(spotifyServiceInstance.isReady as jest.Mock).mockReturnValue(false)
      Object.defineProperty(wssInstance.clients, 'size', {
        value: 1,
        configurable: true,
      })

      const req = new NextRequest('http://localhost/api/health/ready')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('unready')
      expect(data.services.spotify.ready).toBe(false)
      expect(data.services.tabataTimer.ready).toBe(true)
      expect(data.services.websocket.ready).toBe(true)
    })
  })

  it('should return 404 for the base /api/health route', async () => {
    const req = new NextRequest('http://localhost/api/health')
    const response = await GET(req)
    expect(response.status).toBe(404)
  })
})
