// lib/healthCheck.ts
import { WebSocket } from 'ws'
import TabataTimer from '../services/tabataTimer'

// Individual health check functions
export function checkMemoryUsage() {
  const memUsage = process.memoryUsage()
  const memUsageMB = memUsage.heapUsed / 1024 / 1024
  const memLimitMB = 512 // Adjust based on deployment

  return {
    healthy: memUsageMB < memLimitMB,
    details: {
      usedMB: Math.round(memUsageMB),
      limitMB: memLimitMB,
      percentage: Math.round((memUsageMB / memLimitMB) * 100),
    },
  }
}

export async function checkWebSocketService(): Promise<{
  healthy: boolean
  details: Record<string, unknown>
}> {
  try {
    const wsUrl = 'ws://localhost:3000' // Corrected default URL
    // Check if WebSocket server is accepting connections
    const wsHealth = await new Promise((resolve) => {
      const testWs = new WebSocket(wsUrl)

      const timeout = setTimeout(() => {
        testWs.close()
        resolve(false)
      }, 5000)

      testWs.onopen = () => {
        clearTimeout(timeout)
        testWs.close()
        resolve(true)
      }

      testWs.onerror = () => {
        clearTimeout(timeout)
        resolve(false)
      }
    })

    return {
      healthy: Boolean(wsHealth),
      details: {
        service: 'websocket',
        url: wsUrl,
      },
    }
  } catch (error) {
    return {
      healthy: false,
      details: {
        service: 'websocket',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    }
  }
}

export function checkTimerService(tabataTimer: TabataTimer): {
  healthy: boolean
  details: Record<string, unknown>
} {
  try {
    const timerCheck =
      typeof tabataTimer !== 'undefined' && tabataTimer.getState

    return {
      healthy: true,
      details: {
        service: 'timer',
        instance: timerCheck ? 'active' : 'standby',
      },
    }
  } catch (error) {
    return {
      healthy: false,
      details: {
        service: 'timer',
        error: error instanceof Error ? error.message : 'Timer service error',
      },
    }
  }
}
