/**
 * @jest-environment jsdom
 */

import { useHrSignalStats } from '@/hooks/useBluetoothHRM/useHrSignalStats'
import { BluetoothConnectionStatus } from '@/types/bluetooth'
import { STABILITY_THRESHOLD_MS } from '@/constants/bluetooth'
import { renderHook, act } from '@testing-library/react'

interface FakeCharacteristic {
  value: DataView
  addEventListener: jest.Mock
  removeEventListener: jest.Mock
}

const makeCharacteristic = (heartRate: number): FakeCharacteristic => ({
  // flags byte 0x00 = 8-bit rate
  value: new DataView(new Uint8Array([0x00, heartRate]).buffer),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
})

const fireMeasurement = (
  characteristic: FakeCharacteristic,
  heartRate: number
) => {
  characteristic.value = new DataView(new Uint8Array([0x00, heartRate]).buffer)
  const listener = characteristic.addEventListener.mock.calls.find(
    ([type]) => type === 'characteristicvaluechanged'
  )?.[1] as (event: unknown) => void
  listener({ target: characteristic })
}

describe('useHrSignalStats', () => {
  const setup = (
    onHeartRateUpdate?: (heartRate: number) => void,
    status: BluetoothConnectionStatus = BluetoothConnectionStatus.CONNECTED
  ) =>
    renderHook(() =>
      useHrSignalStats({
        currentStatusRef: { current: status },
        onHeartRateUpdate,
      })
    )

  it('starts with zeroed signal statistics', () => {
    const { result } = setup()

    expect(result.current.signalPeriodMs).toBe(0)
    expect(result.current.signalStatus).toEqual({ last: 0, slow: 0 })
  })

  it('parses the heart rate and notifies the caller', () => {
    const onHeartRateUpdate = jest.fn()
    const { result } = setup(onHeartRateUpdate)
    const characteristic = makeCharacteristic(0)

    act(() => result.current.swapHrListener(characteristic as never))
    act(() => fireMeasurement(characteristic, 95))

    expect(onHeartRateUpdate).toHaveBeenCalledWith(95)
  })

  it('records the period between successive measurements', () => {
    jest.useFakeTimers()
    jest.setSystemTime(1_000_000)
    try {
      const { result } = setup()
      const characteristic = makeCharacteristic(0)

      act(() => result.current.swapHrListener(characteristic as never))
      act(() => fireMeasurement(characteristic, 60))
      act(() => {
        jest.setSystemTime(1_000_000 + 800)
        fireMeasurement(characteristic, 61)
      })

      expect(result.current.signalPeriodMs).toBe(800)
      expect(result.current.signalStatus.last).toBe(800)
    } finally {
      jest.useRealTimers()
    }
  })

  it('folds a gap past the missed-packet threshold into the slow-packet count', () => {
    jest.useFakeTimers()
    jest.setSystemTime(2_000_000)
    try {
      const { result } = setup()
      const characteristic = makeCharacteristic(0)
      act(() => result.current.swapHrListener(characteristic as never))
      act(() => fireMeasurement(characteristic, 60))

      // A gap far past MIN_MISSED_PACKET_THRESHOLD_MS: the stability check
      // folds it in and the stability-window diff lands in the slow counter.
      act(() => {
        jest.setSystemTime(2_000_000 + 10 * STABILITY_THRESHOLD_MS)
        result.current.checkSignalStability()
      })

      expect(result.current.signalPeriodMs).toBe(10 * STABILITY_THRESHOLD_MS)
      expect(result.current.signalStatus.slow).toBeGreaterThan(0)
    } finally {
      jest.useRealTimers()
    }
  })

  it('ignores stability gaps while not connected', () => {
    jest.useFakeTimers()
    jest.setSystemTime(3_000_000)
    try {
      const { result } = setup(
        undefined,
        BluetoothConnectionStatus.DISCONNECTED
      )
      act(() => {
        result.current.lastDataTime.current = 3_000_000 - 10_000
      })

      act(() => result.current.checkSignalStability())

      expect(result.current.signalPeriodMs).toBe(0)
      expect(result.current.signalStatus).toEqual({ last: 0, slow: 0 })
    } finally {
      jest.useRealTimers()
    }
  })

  it('swaps the subscription: the previous characteristic is detached', () => {
    const { result } = setup()
    const first = makeCharacteristic(0)
    const second = makeCharacteristic(0)

    act(() => result.current.swapHrListener(first as never))
    expect(first.addEventListener).toHaveBeenCalledWith(
      'characteristicvaluechanged',
      expect.any(Function)
    )

    act(() => result.current.swapHrListener(second as never))

    expect(first.removeEventListener).toHaveBeenCalledWith(
      'characteristicvaluechanged',
      expect.any(Function)
    )
    expect(second.addEventListener).toHaveBeenCalledWith(
      'characteristicvaluechanged',
      expect.any(Function)
    )
  })

  it('removeHrListener detaches the active subscription', () => {
    const { result } = setup()
    const characteristic = makeCharacteristic(0)
    act(() => result.current.swapHrListener(characteristic as never))

    act(() => result.current.removeHrListener())

    expect(characteristic.removeEventListener).toHaveBeenCalledWith(
      'characteristicvaluechanged',
      expect.any(Function)
    )
    // A second removal is a no-op.
    expect(characteristic.removeEventListener).toHaveBeenCalledTimes(1)
  })

  it('resetSignalStats zeroes the statistics after activity', () => {
    jest.useFakeTimers()
    jest.setSystemTime(4_000_000)
    try {
      const { result } = setup()
      const characteristic = makeCharacteristic(0)
      act(() => result.current.swapHrListener(characteristic as never))
      act(() => fireMeasurement(characteristic, 60))
      act(() => {
        jest.setSystemTime(4_000_000 + 900)
        fireMeasurement(characteristic, 61)
      })
      expect(result.current.signalPeriodMs).toBe(900)

      act(() => result.current.resetSignalStats())

      expect(result.current.signalPeriodMs).toBe(0)
      expect(result.current.signalStatus).toEqual({ last: 0, slow: 0 })
    } finally {
      jest.useRealTimers()
    }
  })

  it('ignores a measurement event with no payload', () => {
    const onHeartRateUpdate = jest.fn()
    const { result } = setup(onHeartRateUpdate)
    const characteristic = {
      value: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }

    act(() => result.current.swapHrListener(characteristic as never))
    const listener = characteristic.addEventListener.mock.calls[0][1]
    act(() => listener({ target: characteristic }))

    expect(onHeartRateUpdate).not.toHaveBeenCalled()
  })
})
