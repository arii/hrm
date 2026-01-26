
  describe('Watchdog Timers', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should proactively increase signal period on missed heartbeats', async () => {
      const { result } = renderHook(() => useBluetoothHRM())
      let characteristicValueChangedCallback: (
        event: unknown
      ) => void = () => {}

      const mockCharacteristic = {
        startNotifications: jest.fn().mockResolvedValue(undefined),
        addEventListener: jest.fn((_event, callback) => {
          characteristicValueChangedCallback = callback
        }),
      }
      // @ts-expect-error Gatt is a mock
      mockGatt.connect.mockResolvedValue({
        getPrimaryService: jest.fn().mockResolvedValue({
          getCharacteristic: jest.fn().mockResolvedValue(mockCharacteristic),
        }),
      })

      await act(async () => {
        await result.current.connectAndStream()
      })

      const now = Date.now()
      jest.spyOn(Date, 'now').mockReturnValue(now)
      act(() => {
        characteristicValueChangedCallback({
          target: { value: new DataView(new ArrayBuffer(2)) },
        })
      })
      jest.spyOn(Date, 'now').mockReturnValue(now + 1000)
      act(() => {
        characteristicValueChangedCallback({
          target: { value: new DataView(new ArrayBuffer(2)) },
        })
      })
      expect(result.current.signalPeriodMs).toBe(1000)

      jest.spyOn(Date, 'now').mockReturnValue(now + 3000)
      act(() => {
        jest.advanceTimersByTime(2000)
      })

      expect(result.current.signalPeriodMs).toBe(2000)
    })

    it('should trigger a reconnect when data stream goes stale', async () => {
      const { result } = renderHook(() =>
        useBluetoothHRM({ dataLivenessTimeoutMs: 5000 })
      )
      let characteristicValueChangedCallback: (
        event: unknown
      ) => void = () => {}
      const mockCharacteristic = {
        startNotifications: jest.fn().mockResolvedValue(undefined),
        addEventListener: jest.fn((_event, callback) => {
          characteristicValueChangedCallback = callback
        }),
      }
      // @ts-expect-error Gatt is a mock
      mockGatt.connect.mockResolvedValue({
        getPrimaryService: jest.fn().mockResolvedValue({
          getCharacteristic: jest.fn().mockResolvedValue(mockCharacteristic),
        }),
      })
      await act(async () => {
        await result.current.connectAndStream()
      })
      expect(result.current.deviceStatus).toContain('Connected')
      act(() => {
        characteristicValueChangedCallback({
          target: { value: new DataView(new ArrayBuffer(2)) },
        })
      })
      act(() => {
        jest.advanceTimersByTime(6000) // Exceed the 5s timeout
      })
      expect(result.current.deviceStatus).toBe(
        'Connection unstable. Reconnecting...'
      )
      expect(mockGatt.disconnect).toHaveBeenCalledTimes(1)
    })
  })
})
