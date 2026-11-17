/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useTabCoordination } from '@/hooks/useBluetoothHRM/useTabCoordination'

jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

// Minimal same-process BroadcastChannel: delivers to every other open
// channel of the same name, asynchronously, like the browser does.
class FakeBroadcastChannel {
  static open: FakeBroadcastChannel[] = []
  onmessage: ((event: MessageEvent) => void) | null = null
  constructor(readonly name: string) {
    FakeBroadcastChannel.open.push(this)
  }
  postMessage(data: unknown) {
    for (const peer of FakeBroadcastChannel.open) {
      if (peer !== this && peer.name === this.name) {
        queueMicrotask(() => peer.onmessage?.({ data } as MessageEvent))
      }
    }
  }
  close() {
    FakeBroadcastChannel.open = FakeBroadcastChannel.open.filter(
      (c) => c !== this
    )
  }
}

const strap = { id: 'hr6', name: 'HR6 0050855' } as BluetoothDevice

describe('useTabCoordination', () => {
  beforeEach(() => {
    FakeBroadcastChannel.open = []
    ;(globalThis as { BroadcastChannel?: unknown }).BroadcastChannel =
      FakeBroadcastChannel
  })

  afterEach(() => {
    delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel
  })

  const flush = () => act(async () => {})

  it('sees the strap a tab already holds, and gets it released on request', async () => {
    const onReleaseRequested = jest.fn()
    const holder = renderHook(
      ({ held }: { held: BluetoothDevice | null }) =>
        useTabCoordination({
          tabId: 'tab-a',
          heldDevice: held,
          onReleaseRequested,
        }),
      { initialProps: { held: strap } }
    )
    await flush()
    const other = renderHook(() =>
      useTabCoordination({
        tabId: 'tab-b',
        heldDevice: null,
        onReleaseRequested: jest.fn(),
      })
    )
    await flush()

    expect(other.result.current.otherTabHolding(strap)).toEqual({
      tabId: 'tab-a',
      deviceName: 'HR6 0050855',
    })

    let released: Promise<boolean> | undefined
    act(() => {
      released = other.result.current.requestRelease(strap, 3000)
    })
    await flush()
    expect(onReleaseRequested).toHaveBeenCalledWith('HR6 0050855')

    holder.rerender({ held: null })
    await flush()
    await expect(released).resolves.toBe(true)
    expect(other.result.current.otherTabHolding(strap)).toBeNull()
  })

  it('stops waiting for a tab that never answers', async () => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask'] })
    try {
      renderHook(() =>
        useTabCoordination({
          tabId: 'tab-a',
          heldDevice: strap,
          onReleaseRequested: jest.fn(),
        })
      )
      await flush()
      const other = renderHook(() =>
        useTabCoordination({
          tabId: 'tab-b',
          heldDevice: null,
          onReleaseRequested: jest.fn(),
        })
      )
      await flush()

      let released: Promise<boolean> | undefined
      act(() => {
        released = other.result.current.requestRelease(strap, 3000)
      })
      await act(async () => {
        await jest.advanceTimersByTimeAsync(3000)
      })
      await expect(released).resolves.toBe(false)
    } finally {
      jest.useRealTimers()
    }
  })

  it('is a no-op without BroadcastChannel', () => {
    delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel
    const { result } = renderHook(() =>
      useTabCoordination({ heldDevice: strap, onReleaseRequested: jest.fn() })
    )
    expect(result.current.otherTabHolding(strap)).toBeNull()
  })
})
