/**
 * @jest-environment node
 */
import { getHealthChecks } from '../../lib/health'
import { SpotifyPolling } from '../../services/spotifyPolling'
import TabataTimer from '../../services/tabataTimer'
import { WebSocketServer } from 'ws'
import fs from 'fs/promises'
import path from 'path'

// Mock the services
jest.mock('../../services/spotifyPolling')
jest.mock('../../services/tabataTimer')
jest.mock('ws')
jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
  unlink: jest.fn(),
}))

const mockSpotifyPolling = SpotifyPolling as jest.MockedClass<
  typeof SpotifyPolling
>
const mockTabataTimer = TabataTimer as jest.MockedClass<typeof TabataTimer>
const mockWebSocketServer = WebSocketServer as jest.MockedClass<
  typeof WebSocketServer
>
const mockFs = fs as jest.Mocked<typeof fs>

describe('Health Checks', () => {
  let wss: WebSocketServer
  let spotifyService: SpotifyPolling
  let tabataService: TabataTimer

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()

    // Create mock instances
    wss = new mockWebSocketServer()
    // FIX: The mocked WebSocketServer does not have a 'clients' property by default.
    // We need to manually initialize it as a Set for the tests to work.
    ;(wss as any).clients = new Set<any>()
    // Provide a default mock implementation for SpotifyPolling.create
    mockSpotifyPolling.create.mockResolvedValue({
      isReady: jest.fn().mockReturnValue(true),
    } as unknown as SpotifyPolling)
    spotifyService = new mockSpotifyPolling(jest.fn())
    tabataService = new mockTabataTimer(jest.fn())
  })

  describe('getHealthChecks', () => {
    it('should return "healthy" status when all checks pass', async () => {
      // Arrange: Healthy state
      ;(spotifyService.isReady as jest.Mock).mockReturnValue(true)
      mockFs.writeFile.mockResolvedValue(undefined)
      mockFs.unlink.mockResolvedValue(undefined)

      // Act
      const health = await getHealthChecks({ wss, spotifyService, tabataService })

      // Assert
      expect(health.status).toBe('healthy')
      expect(health.checks.websocket).toBe('ok')
      expect(health.checks.spotify).toBe('ok')
      expect(health.checks.storage).toBe('ok')
      expect(health.checks.tabataTimer).toBe('ok')
    })

    it('should return "unhealthy" if WebSocket service is not available', async () => {
      // Arrange: Unhealthy WebSocket
      (spotifyService.isReady as jest.Mock).mockReturnValue(true)
      mockFs.writeFile.mockResolvedValue(undefined)

      // Act
      const health = await getHealthChecks({ wss: null as any, spotifyService, tabataService })

      // Assert
      expect(health.status).toBe('unhealthy')
      expect(health.checks.websocket).toBe('error')
    })

    it('should return "unhealthy" if Spotify service is not ready', async () => {
      // Arrange: Unhealthy Spotify
      ;(wss.clients as Set<unknown>).add({})
      ;(spotifyService.isReady as jest.Mock).mockReturnValue(false)
      mockFs.writeFile.mockResolvedValue(undefined)

      // Act
      const health = await getHealthChecks({ wss, spotifyService, tabataService })

      // Assert
      expect(health.status).toBe('unhealthy')
      expect(health.checks.spotify).toBe('error')
    })

    it('should return "unhealthy" if storage check fails', async () => {
      // Arrange: Unhealthy Storage
      ;(wss.clients as Set<unknown>).add({})
      ;(spotifyService.isReady as jest.Mock).mockReturnValue(true)
      mockFs.writeFile.mockRejectedValue(new Error('Disk full'))

      // Act
      const health = await getHealthChecks({ wss, spotifyService, tabataService })

      // Assert
      expect(health.status).toBe('unhealthy')
      expect(health.checks.storage).toBe('error')
      expect(mockFs.unlink).not.toHaveBeenCalled() // Ensure unlink is not called on write failure
    })

    it('should return "unhealthy" if TabataTimer is not available', async () => {
        // Arrange: Unhealthy TabataTimer by passing a null or undefined object
        (wss.clients as Set<unknown>).add({});
        (spotifyService.isReady as jest.Mock).mockReturnValue(true);
        mockFs.writeFile.mockResolvedValue(undefined);

        // Act
        // Cast to 'any' to bypass TypeScript's type checking for the test case
        const health = await getHealthChecks({ wss, spotifyService, tabataService: null as any });

        // Assert
        expect(health.status).toBe('unhealthy');
        expect(health.checks.tabataTimer).toBe('error');
    });

    it('should have a recent ISO timestamp', async () => {
        // Arrange
        const beforeTimestamp = new Date().toISOString()

        // Act
        const health = await getHealthChecks({ wss, spotifyService, tabataService })
        const afterTimestamp = new Date().toISOString()

        // Assert
        expect(health.timestamp).toBeDefined()
        expect(health.timestamp >= beforeTimestamp).toBe(true)
        expect(health.timestamp <= afterTimestamp).toBe(true)
    });
  })
})
