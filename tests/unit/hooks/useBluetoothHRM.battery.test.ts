/**
 * @jest-environment jsdom
 */
import { setupBatteryNotifications } from '@/hooks/useBluetoothHRM'

describe('setupBatteryNotifications', () => {
  const makeServer = (level: number) => {
    const listeners: Record<string, (e: unknown) => void> = {}
    const char = {
      readValue: jest.fn().mockResolvedValue({
        getUint8: () => level,
      }),
      startNotifications: jest.fn().mockResolvedValue(undefined),
      addEventListener: jest.fn((event: string, cb: (e: unknown) => void) => {
        listeners[event] = cb
      }),
    }
    const server = {
      getPrimaryService: jest.fn().mockResolvedValue({
        getCharacteristic: jest.fn().mockResolvedValue(char),
      }),
    }
    return { server, char, listeners }
  }

  it('reports the initial level and subscribes to changes', async () => {
    const onBatteryLevel = jest.fn()
    const { server, listeners } = makeServer(87)
    await setupBatteryNotifications(server as never, onBatteryLevel)
    expect(onBatteryLevel).toHaveBeenCalledWith(87)

    // Simulate a battery notification event.
    listeners['characteristicvaluechanged']({
      target: { value: { getUint8: () => 86 } },
    })
    expect(onBatteryLevel).toHaveBeenCalledWith(86)
  })

  it('resolves silently when the battery service is missing', async () => {
    const onBatteryLevel = jest.fn()
    const server = {
      getPrimaryService: jest
        .fn()
        .mockRejectedValue(new Error('No battery service')),
    }
    await expect(
      setupBatteryNotifications(server as never, onBatteryLevel)
    ).resolves.toBeUndefined()
    expect(onBatteryLevel).not.toHaveBeenCalled()
  })
})
