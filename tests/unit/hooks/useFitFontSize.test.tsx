/**
 * @jest-environment jsdom
 */
import { render, act } from '@testing-library/react'
import { fitFontSizeToBox, useUniformFitFontSize } from '@/hooks/useFitFontSize'

// jsdom has no layout engine: box measurements are mocked per test via
// defineProperty. The hook itself uses no observers (mount, resetKey,
// window resize, and one font-settle pass are the only triggers).

const proto = HTMLElement.prototype as unknown as Record<string, unknown>

const installPrototypeBox = (box: {
  clientHeight: number
  scrollHeight: number
}) => {
  const saved = {
    scrollHeight: Object.getOwnPropertyDescriptor(proto, 'scrollHeight'),
    clientHeight: Object.getOwnPropertyDescriptor(proto, 'clientHeight'),
    scrollWidth: Object.getOwnPropertyDescriptor(proto, 'scrollWidth'),
    clientWidth: Object.getOwnPropertyDescriptor(proto, 'clientWidth'),
  }
  Object.defineProperty(proto, 'scrollHeight', {
    value: box.scrollHeight,
    configurable: true,
  })
  Object.defineProperty(proto, 'clientHeight', {
    value: box.clientHeight,
    configurable: true,
  })
  Object.defineProperty(proto, 'scrollWidth', { value: 0, configurable: true })
  Object.defineProperty(proto, 'clientWidth', {
    value: 1000,
    configurable: true,
  })
  return () => {
    for (const [key, desc] of Object.entries(saved)) {
      if (desc) Object.defineProperty(proto, key, desc)
      else delete proto[key]
    }
  }
}

const mockBox = (
  el: HTMLElement,
  box: { clientHeight: number; scrollHeightOf: () => number }
) => {
  Object.defineProperty(el, 'clientHeight', {
    value: box.clientHeight,
    configurable: true,
  })
  Object.defineProperty(el, 'clientWidth', { value: 1000, configurable: true })
  Object.defineProperty(el, 'scrollHeight', {
    get: box.scrollHeightOf,
    configurable: true,
  })
  Object.defineProperty(el, 'scrollWidth', { value: 0, configurable: true })
}

describe('fitFontSizeToBox', () => {
  it('holds max size when the content already fits', () => {
    const el = document.createElement('div')
    mockBox(el, { clientHeight: 200, scrollHeightOf: () => 100 })

    expect(fitFontSizeToBox(el, { minPx: 14, maxPx: 28 })).toBe(28)
    expect(el.style.fontSize).toBe('28px')
  })

  it('shrinks until the content fits', () => {
    const el = document.createElement('div')
    mockBox(el, {
      clientHeight: 200,
      scrollHeightOf: () => parseFloat(el.style.fontSize || '28') * 10,
    })

    // 28px -> 280 overflows; 20px -> 200 fits exactly.
    expect(fitFontSizeToBox(el, { minPx: 14, maxPx: 28 })).toBe(20)
    expect(el.style.fontSize).toBe('20px')
  })

  it('stops at the floor when nothing fits', () => {
    const el = document.createElement('div')
    mockBox(el, { clientHeight: 200, scrollHeightOf: () => 9999 })

    expect(fitFontSizeToBox(el, { minPx: 14, maxPx: 28 })).toBe(14)
    expect(el.style.fontSize).toBe('14px')
  })

  it('respects a custom step size and clamps the start', () => {
    const el = document.createElement('div')
    mockBox(el, {
      clientHeight: 200,
      scrollHeightOf: () => parseFloat(el.style.fontSize || '28') * 10,
    })

    // 28 -> 280 overflow; 23 -> 230 overflow; 18 -> 180 fits.
    expect(fitFontSizeToBox(el, { minPx: 14, maxPx: 28, stepPx: 5 })).toBe(18)
    // Start above max clamps down; the pass still converges.
    expect(fitFontSizeToBox(el, { minPx: 14, maxPx: 28, startPx: 99 })).toBe(20)
  })
})

describe('useUniformFitFontSize', () => {
  const Harness = ({
    resetKey,
    dense,
  }: {
    resetKey: unknown
    dense: boolean
  }) => {
    const ref = useUniformFitFontSize<HTMLDivElement>('[data-fit-item]', {
      minPx: 14,
      maxPx: 28,
      resetKey,
    })
    return (
      <div ref={ref}>
        <div data-fit-item="sparse">sparse</div>
        {dense && <div data-fit-item="dense">dense</div>}
      </div>
    )
  }

  const itemsOf = (container: HTMLElement) =>
    Array.from(container.querySelectorAll<HTMLElement>('[data-fit-item]'))

  it('applies one shared size: the minimum of the fits', () => {
    const restore = installPrototypeBox({
      clientHeight: 200,
      scrollHeight: 100,
    })
    try {
      const { container } = render(<Harness resetKey={1} dense={false} />)
      const [only] = itemsOf(container) as [HTMLElement]
      // Sparse box fits at max on the mount pass (layout effect, sync).
      expect(only.style.fontSize).toBe('28px')
    } finally {
      restore()
    }
  })

  it('a dense item shrinks every item to its fit', () => {
    const restore = installPrototypeBox({
      clientHeight: 200,
      scrollHeight: 100,
    })
    try {
      const { container, rerender } = render(
        <Harness resetKey={1} dense={true} />
      )
      const [sparse, dense] = itemsOf(container) as [HTMLElement, HTMLElement]
      // Per-item overflows: sparse fits at max, dense needs 20px.
      mockBox(sparse, { clientHeight: 200, scrollHeightOf: () => 100 })
      mockBox(dense, {
        clientHeight: 200,
        scrollHeightOf: () => parseFloat(dense.style.fontSize || '28') * 10,
      })
      // New content generation refits; both land on the dense fit.
      rerender(<Harness resetKey={2} dense={true} />)

      expect(sparse.style.fontSize).toBe('20px')
      expect(dense.style.fontSize).toBe('20px')
    } finally {
      restore()
    }
  })

  it('refits on window resize', async () => {
    const restore = installPrototypeBox({
      clientHeight: 200,
      scrollHeight: 100,
    })
    try {
      const { container } = render(<Harness resetKey={1} dense={true} />)
      const [sparse, dense] = itemsOf(container) as [HTMLElement, HTMLElement]
      expect(sparse.style.fontSize).toBe('28px')

      // Viewport shrinks the boxes: everything must step down together.
      for (const el of [sparse, dense]) {
        mockBox(el, { clientHeight: 200, scrollHeightOf: () => 9999 })
      }
      await act(async () => {
        window.dispatchEvent(new Event('resize'))
        await new Promise((resolve) => setTimeout(resolve, 250))
      })

      expect(sparse.style.fontSize).toBe('14px')
      expect(dense.style.fontSize).toBe('14px')
    } finally {
      restore()
    }
  })

  it('shrinks below item fits until the page fits', () => {
    const restore = installPrototypeBox({
      clientHeight: 200,
      scrollHeight: 100,
    })
    try {
      // Fake dashboard root overflows its viewport cap while the items
      // fit their own boxes. scrollHeight tracks the applied uniform
      // size, so the page loop must step down on the mount pass itself:
      // 500 + size*8 <= 697 needs size <= 24 (24*8+500 = 692).
      const pageEl = document.createElement('div')
      pageEl.setAttribute('data-testid', 'dashboard')
      Object.defineProperty(pageEl, 'clientHeight', {
        value: 696,
        configurable: true,
      })
      Object.defineProperty(pageEl, 'scrollHeight', {
        get: () => {
          const first = pageEl.querySelector<HTMLElement>('[data-fit-item]')
          const size = parseFloat(first?.style.fontSize || '28')
          return 500 + size * 8
        },
        configurable: true,
      })
      document.body.appendChild(pageEl)
      try {
        const PageHarness = () => {
          const ref = useUniformFitFontSize<HTMLDivElement>('[data-fit-item]', {
            minPx: 14,
            maxPx: 28,
            resetKey: 1,
          })
          return (
            <div ref={ref}>
              <div data-fit-item="a">a</div>
              <div data-fit-item="b">b</div>
            </div>
          )
        }
        // Render directly into the fake dashboard so closest() resolves
        // on mount; nodes never move, so unmount cleanup stays valid.
        const { container } = render(<PageHarness />, { container: pageEl })
        const [a, b] = itemsOf(container) as [HTMLElement, HTMLElement]
        expect(a.style.fontSize).toBe('24px')
        expect(b.style.fontSize).toBe('24px')
      } finally {
        document.body.removeChild(pageEl)
      }
    } finally {
      restore()
    }
  })

  it('renders nothing measurable without items', () => {
    const restore = installPrototypeBox({
      clientHeight: 200,
      scrollHeight: 100,
    })
    try {
      const Empty = () => {
        const ref = useUniformFitFontSize<HTMLDivElement>('[data-fit-item]', {
          minPx: 14,
          maxPx: 28,
          resetKey: 1,
        })
        return <div ref={ref} />
      }
      expect(() => render(<Empty />)).not.toThrow()
    } finally {
      restore()
    }
  })
})
