/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useFullReset } from '@/hooks/useFullReset'

describe('useFullReset', () => {
  it('forgets the device, resets, and clears the resetting flag', async () => {
    const onForgetDevice = jest.fn().mockResolvedValue(undefined)
    const onReset = jest.fn()
    const { result } = renderHook(() => useFullReset(onForgetDevice, onReset))
    expect(result.current.isResetting).toBe(false)

    await act(async () => {
      await result.current.handleFullReset()
    })

    expect(onForgetDevice).toHaveBeenCalledTimes(1)
    expect(onReset).toHaveBeenCalledTimes(1)
    expect(result.current.isResetting).toBe(false)
  })

  it('clears the resetting flag when forget fails', async () => {
    const onForgetDevice = jest
      .fn()
      .mockRejectedValue(new Error('forget failed'))
    const onReset = jest.fn()
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { result } = renderHook(() => useFullReset(onForgetDevice, onReset))

      await act(async () => {
        await result.current.handleFullReset()
      })

      expect(onReset).not.toHaveBeenCalled()
      expect(result.current.isResetting).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Reset failed:',
        expect.any(Error)
      )
    } finally {
      consoleSpy.mockRestore()
    }
  })
})
