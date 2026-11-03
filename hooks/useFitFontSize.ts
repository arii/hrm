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
 * Each pass resets to maxPx and steps down monotonically, so the loop is
 * bounded by (maxPx - minPx) / stepPx iterations and cannot oscillate.
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

    const fitNow = () => {
      const { minPx: min, maxPx: max, stepPx: step } = optsRef.current
      let size = max
      el.style.fontSize = `${size}px`
      while (size > min && overflows()) {
        size = Math.max(min, size - step)
        el.style.fontSize = `${size}px`
      }
    }

    const scheduleFit = () => {
      cancelFrame(frame)
      frame = scheduleFrame(fitNow)
    }

    // Refit on box changes (viewport resize, row-height changes)...
    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(scheduleFit)
      ro.observe(el)
    }
    // ...and on content changes (new workout data doesn't resize the box).
    let mo: MutationObserver | null = null
    if (typeof MutationObserver !== 'undefined') {
      mo = new MutationObserver(scheduleFit)
      mo.observe(el, { childList: true, subtree: true, characterData: true })
    }

    // Initial pass. Without observers (SSR-ish/jsdom/old browsers) this
    // single synchronous pass is the whole behavior.
    if (!ro && !mo) {
      fitNow()
    } else {
      scheduleFit()
    }

    return () => {
      cancelFrame(frame)
      ro?.disconnect()
      mo?.disconnect()
    }
  }, [])

  return ref
}
