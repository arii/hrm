/**
 * @jest-environment jsdom
 */
import { render, act } from '@testing-library/react'
import { useFitFontSize } from '@/hooks/useFitFontSize'

// jsdom has no layout engine: box measurements are mocked per test via
// defineProperty, and the observer globals are stubbed to capture callbacks.

describe('useFitFontSize', () => {
  let roCallback: (() => void) | null = null
  let moCallback: (() => void) | null = null
  let observedEl: Element | null = null

  const globals = globalThis as unknown as Record<string, unknown>

  beforeEach(() => {
    roCallback = null
    moCallback = null
    observedEl = null
    globals.ResizeObserver = class {
      constructor(cb: () => void) {
        roCallback = cb
      }
      observe = (el: Element) => {
        observedEl = el
      }
      disconnect = jest.fn()
      unobserve = jest.fn()
    }
    globals.MutationObserver = class {
      constructor(cb: () => void) {
        moCallback = cb
      }
      observe = jest.fn()
      disconnect = jest.fn()
    }
  })

  afterEach(() => {
    delete globals.ResizeObserver
    delete globals.MutationObserver
  })

  const Harness = ({
    minPx,
    maxPx,
    stepPx,
    elRef,
  }: {
    minPx: number
    maxPx: number
    stepPx?: number
    elRef: { current: HTMLElement | null }
  }) => {
    const ref = useFitFontSize<HTMLDivElement>({ minPx, maxPx, stepPx })
    return (
      <div
        ref={(node) => {
          ref.current = node
          elRef.current = node
        }}
        data-testid="box"
      />
    )
  }

  const renderHarness = (opts: {
    minPx: number
    maxPx: number
    stepPx?: number
  }) => {
    const elRef: { current: HTMLElement | null } = { current: null }
    render(<Harness {...opts} elRef={elRef} />)
    const el = elRef.current
    if (!el) throw new Error('harness element did not mount')
    return el
  }

  /** flush the rAF/setTimeout-scheduled fit pass */
  const flushFit = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
  }

  const mockBox = (
    el: HTMLElement,
    box: { clientHeight: number; scrollHeightOf: () => number }
  ) => {
    Object.defineProperty(el, 'clientHeight', {
      value: box.clientHeight,
      configurable: true,
    })
    Object.defineProperty(el, 'clientWidth', {
      value: 1000,
      configurable: true,
    })
    Object.defineProperty(el, 'scrollHeight', {
      get: box.scrollHeightOf,
      configurable: true,
    })
    Object.defineProperty(el, 'scrollWidth', { value: 0, configurable: true })
  }

  it('holds max size when the content already fits', async () => {
    const el = renderHarness({ minPx: 14, maxPx: 28 })
    mockBox(el, { clientHeight: 200, scrollHeightOf: () => 100 })
    await flushFit()

    expect(el.style.fontSize).toBe('28px')
    expect(observedEl).toBe(el)
  })

  it('shrinks until the content fits', async () => {
    const el = renderHarness({ minPx: 14, maxPx: 28 })
    // Simulated layout: content height tracks the applied size.
    mockBox(el, {
      clientHeight: 200,
      scrollHeightOf: () => parseFloat(el.style.fontSize || '28') * 10,
    })
    await flushFit()

    // 28px -> 280 overflows; 20px -> 200 fits exactly.
    expect(el.style.fontSize).toBe('20px')
  })

  it('stops at the floor when nothing fits', async () => {
    const el = renderHarness({ minPx: 14, maxPx: 28 })
    mockBox(el, { clientHeight: 200, scrollHeightOf: () => 9999 })
    await flushFit()

    expect(el.style.fontSize).toBe('14px')
  })

  it('respects a custom step size', async () => {
    const el = renderHarness({ minPx: 14, maxPx: 28, stepPx: 5 })
    mockBox(el, {
      clientHeight: 200,
      scrollHeightOf: () => parseFloat(el.style.fontSize || '28') * 10,
    })
    await flushFit()

    // 28 -> 280 overflow; 23 -> 230 overflow; 18 -> 180 fits.
    expect(el.style.fontSize).toBe('18px')
  })

  it('refits when the box resizes', async () => {
    const el = renderHarness({ minPx: 14, maxPx: 28 })
    let boxHeight = 200
    mockBox(el, {
      clientHeight: 200,
      scrollHeightOf: () =>
        (parseFloat(el.style.fontSize || '28') * 10 * 200) / boxHeight,
    })
    await flushFit()
    expect(el.style.fontSize).toBe('20px')

    // Viewport shrinks: same type now overflows a shorter box.
    boxHeight = 100
    act(() => {
      roCallback?.()
    })
    await flushFit()

    expect(el.style.fontSize).toBe('14px')
  })

  it('refits when the content mutates', async () => {
    const el = renderHarness({ minPx: 14, maxPx: 28 })
    let lines = 1
    mockBox(el, {
      clientHeight: 200,
      scrollHeightOf: () => parseFloat(el.style.fontSize || '28') * 10 * lines,
    })
    await flushFit()
    expect(el.style.fontSize).toBe('20px')

    // New workout data doubles the content; box size unchanged.
    lines = 2
    act(() => {
      moCallback?.()
    })
    await flushFit()

    expect(el.style.fontSize).toBe('14px')
  })

  it('runs a single synchronous pass without observers', () => {
    delete globals.ResizeObserver
    delete globals.MutationObserver
    // Overflow must exist from mount: mock at the prototype level.
    const proto = HTMLElement.prototype as unknown as Record<string, unknown>
    const saved = {
      scrollHeight: Object.getOwnPropertyDescriptor(proto, 'scrollHeight'),
      clientHeight: Object.getOwnPropertyDescriptor(proto, 'clientHeight'),
      scrollWidth: Object.getOwnPropertyDescriptor(proto, 'scrollWidth'),
      clientWidth: Object.getOwnPropertyDescriptor(proto, 'clientWidth'),
    }
    try {
      Object.defineProperty(proto, 'scrollHeight', {
        value: 9999,
        configurable: true,
      })
      Object.defineProperty(proto, 'clientHeight', {
        value: 200,
        configurable: true,
      })
      Object.defineProperty(proto, 'scrollWidth', {
        value: 0,
        configurable: true,
      })
      Object.defineProperty(proto, 'clientWidth', {
        value: 1000,
        configurable: true,
      })
      const el = renderHarness({ minPx: 14, maxPx: 28 })
      expect(el.style.fontSize).toBe('14px')
    } finally {
      for (const [key, desc] of Object.entries(saved)) {
        if (desc) Object.defineProperty(proto, key, desc)
        else delete proto[key]
      }
    }
  })
})
