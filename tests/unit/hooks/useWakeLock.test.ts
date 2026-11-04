/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react'
import { useWakeLock } from '@/hooks/useWakeLock'

describe('useWakeLock', () => {
  const originalWakeLock = (
    window.navigator as Navigator & { wakeLock?: unknown }
  ).wakeLock
  const originalVisibility = Object.getOwnPropertyDescriptor(
    Document.prototype,
    'visibilityState'
  )

  let request: jest.Mock
  let releaseSentinel: jest.Mock

  const mockSentinel = () => ({
    released: false,
    release: releaseSentinel,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })

  const setVisibility = (state: 'visible' | 'hidden') => {
    Object.defineProperty(document, 'visibilityState', {
      value: state,
      configurable: true,
    })
  }

  beforeEach(() => {
    releaseSentinel = jest.fn().mockResolvedValue(undefined)
    request = jest.fn().mockResolvedValue(mockSentinel())
    Object.defineProperty(window.navigator, 'wakeLock', {
      value: { request },
      configurable: true,
    })
    setVisibility('visible')
  })

  afterEach(() => {
    if (originalWakeLock === undefined) {
      // @ts-expect-error restoring an originally-absent property
      delete window.navigator.wakeLock
    } else {
      Object.defineProperty(window.navigator, 'wakeLock', {
        value: originalWakeLock,
        configurable: true,
      })
    }
    if (originalVisibility) {
      Object.defineProperty(
        Document.prototype,
        'visibilityState',
        originalVisibility
      )
    } else {
      // @ts-expect-error restoring an originally-absent property
      delete document.visibilityState
    }
    jest.clearAllMocks()
  })

  it('requests a screen lock while active and releases when inactive', async () => {
    const { rerender, unmount } = renderHook(
      ({ active }: { active: boolean }) => useWakeLock(active),
      { initialProps: { active: true } }
    )

    await Promise.resolve()
    expect(request).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledWith('screen')

    rerender({ active: false })
    expect(releaseSentinel).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('releases the lock on unmount', async () => {
    const { unmount } = renderHook(() => useWakeLock(true))
    await Promise.resolve()
    expect(request).toHaveBeenCalledTimes(1)
    unmount()
    expect(releaseSentinel).toHaveBeenCalledTimes(1)
  })

  it('does nothing where the API is unsupported', async () => {
    // @ts-expect-error simulating an unsupported browser
    delete window.navigator.wakeLock
    const { unmount } = renderHook(() => useWakeLock(true))
    await Promise.resolve()
    expect(request).not.toHaveBeenCalled()
    unmount()
  })

  it('does not request while hidden, and acquires on return to visible', async () => {
    setVisibility('hidden')
    renderHook(() => useWakeLock(true))
    await Promise.resolve()
    expect(request).not.toHaveBeenCalled()

    setVisibility('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('re-acquires after the OS releases the lock', async () => {
    let releaseListener: (() => void) | undefined
    request.mockResolvedValue({
      ...mockSentinel(),
      addEventListener: jest.fn((_: string, listener: () => void) => {
        releaseListener = listener
      }),
    })
    renderHook(() => useWakeLock(true))
    await Promise.resolve()
    expect(request).toHaveBeenCalledTimes(1)

    // OS takes the lock back (explicit screen lock): handle dropped...
    releaseListener?.()
    // ...and the return to visible acquires a fresh one.
    document.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('survives a rejected request without throwing', async () => {
    request.mockRejectedValue(new DOMException('denied', 'NotAllowedError'))
    const { unmount } = renderHook(() => useWakeLock(true))
    await Promise.resolve()
    expect(request).toHaveBeenCalledTimes(1)
    unmount()
  })
})
