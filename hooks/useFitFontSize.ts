import { useEffect, useRef, type RefObject } from 'react'

interface FitFontSizeOptions {
  /** Floor: never shrink below this (px). Content that still overflows scrolls. */
  minPx: number
  /** Start (and reset) size in px. */
  maxPx: number
  /** Shrink increment in px. Defaults to 1. */
  stepPx?: number
}

const scheduleFrame =
  typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame
    : (cb: () => void): number => {
        setTimeout(cb, 0)
        return 0
      }

const cancelFrame =
  typeof cancelAnimationFrame === 'function'
    ? cancelAnimationFrame
    : (id: number) => clearTimeout(id)

/**
 * Shrinks an element's font size until its content fits without scrolling,
 * then holds it. Re-fits when the box resizes (viewport/row changes) or the
 * content mutates (new workout data).
 *
 * Settle-proof reset policy: a pass only ever resets to maxPx when the box
 * grew or the content changed (cases where a larger size may now fit).
 * Same-or-smaller boxes shrink from the current size instead. Every pass
 * is therefore monotonic down from its start, bounded by
 * (maxPx - minPx) / stepPx iterations, and repeated triggers converge
 * instead of oscillating.
 * Measurement runs in effects only, so server renders are unaffected (the
 * element keeps its stylesheet size until hydration refines it).
 *
 * @returns ref to attach to the measured element.
 */
export const useFitFontSize = <T extends HTMLElement>({
  minPx,
  maxPx,
  stepPx = 1,
}: FitFontSizeOptions): RefObject<T | null> => {
  const ref = useRef<T | null>(null)
  const optsRef = useRef({ minPx, maxPx, stepPx })
  // Sync latest options for the observers (ref writes belong in effects).
  useEffect(() => {
    optsRef.current = { minPx, maxPx, stepPx }
  })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let frame = 0
    const overflows = (): boolean =>
      el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth

    const currentSize = (): number => {
      const { maxPx: max } = optsRef.current
      const applied = parseFloat(el.style.fontSize || '')
      return Number.isFinite(applied) ? Math.min(max, applied) : max
    }

    const fitNow = (reset: boolean) => {
      const { minPx: min, maxPx: max, stepPx: step } = optsRef.current
      let size = reset ? max : currentSize()
      el.style.fontSize = `${size}px`
      while (size > min && overflows()) {
        size = Math.max(min, size - step)
        el.style.fontSize = `${size}px`
      }
    }

    const scheduleFit = (reset: boolean) => {
      cancelFrame(frame)
      frame = scheduleFrame(() => fitNow(reset))
    }

    // Last seen box, to tell growth (may fit larger type: reset) from
    // same-or-smaller (shrink from current; never reset, never oscillates).
    let lastBox = { w: el.clientWidth, h: el.clientHeight }
    const onResize = () => {
      const box = { w: el.clientWidth, h: el.clientHeight }
      const grew = box.w > lastBox.w || box.h > lastBox.h
      lastBox = box
      scheduleFit(grew)
    }

    // Refit on box changes (viewport resize, row-height changes)...
    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(onResize)
      ro.observe(el)
    }
    // ...and on content changes (new workout data doesn't resize the box,
    // and may have shrunk: always reset, then shrink to fit).
    let mo: MutationObserver | null = null
    if (typeof MutationObserver !== 'undefined') {
      mo = new MutationObserver(() => scheduleFit(true))
      mo.observe(el, { childList: true, subtree: true, characterData: true })
    }

    // Initial pass. Without observers (SSR-ish/jsdom/old browsers) this
    // single synchronous pass is the whole behavior.
    if (!ro && !mo) {
      fitNow(true)
    } else {
      scheduleFit(true)
    }

    return () => {
      cancelFrame(frame)
      ro?.disconnect()
      mo?.disconnect()
    }
  }, [])

  return ref
}
