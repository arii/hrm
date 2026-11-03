import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'

interface FitFontSizeOptions {
  /** Floor: never shrink below this (px). Content that still overflows scrolls. */
  minPx: number
  /** Start size in px. */
  maxPx: number
  /** Shrink increment in px. Defaults to 1. */
  stepPx?: number
}

// Layout effect on the client (fit before paint: no mount flash), plain
// effect on the server (avoids the SSR useLayoutEffect warning).
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

const RESIZE_DEBOUNCE_MS = 150

/**
 * Pure shrink step: sets el to startPx, then steps down until the content
 * fits or minPx is reached. Returns the applied size. Monotonic down and
 * bounded by (startPx - minPx) / stepPx iterations.
 */
export const fitFontSizeToBox = (
  el: HTMLElement,
  {
    minPx,
    maxPx,
    stepPx = 1,
    startPx,
  }: FitFontSizeOptions & { startPx?: number }
): number => {
  let size = Math.min(maxPx, Math.max(minPx, startPx ?? maxPx))
  el.style.fontSize = `${size}px`
  while (
    size > minPx &&
    (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth)
  ) {
    size = Math.max(minPx, size - stepPx)
    el.style.fontSize = `${size}px`
  }
  return size
}

interface UniformFitOptions extends FitFontSizeOptions {
  /**
   * Refit generation key. Pass data identity (a refetch produces a new
   * object) so new content refits. Deliberately NOT box/DOM observers:
   * fitting runs on mount, when resetKey changes, on window resize, and
   * once when webfonts settle -- never in response to its own output, so
   * the loop cannot oscillate.
   */
  resetKey: unknown
}

/**
 * Fits every item matching selector inside the container to ONE shared
 * size: the minimum of their individual fits. Uniform by construction --
 * a dense card shrinks all cards, never just itself.
 *
 * @param selector CSS selector for the measured items (e.g. card bodies).
 * @returns ref to attach to the container element.
 */
export const useUniformFitFontSize = <T extends HTMLElement>(
  selector: string,
  { minPx, maxPx, stepPx = 1, resetKey }: UniformFitOptions
): RefObject<T | null> => {
  const ref = useRef<T | null>(null)
  const optsRef = useRef({ minPx, maxPx, stepPx })
  useEffect(() => {
    optsRef.current = { minPx, maxPx, stepPx }
  })

  useIsomorphicLayoutEffect(() => {
    const container = ref.current
    if (!container) return

    const fitAll = () => {
      const opts = optsRef.current
      const items = Array.from(
        container.querySelectorAll<HTMLElement>(selector)
      )
      if (items.length === 0) return
      const fitted = items.map((item) => fitFontSizeToBox(item, { ...opts }))
      const uniform = Math.min(...fitted)
      items.forEach((item) => {
        item.style.fontSize = `${uniform}px`
      })
    }

    // Initial pass runs in the layout effect: first paint is already
    // fitted, so mounts and remounts never visibly pulse.
    fitAll()

    let timer: ReturnType<typeof setTimeout> | null = null
    const onResize = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(fitAll, RESIZE_DEBOUNCE_MS)
    }
    window.addEventListener('resize', onResize)

    // Webfont swaps change metrics after mount; refit once when the
    // initial font load settles (fires once, cannot loop).
    let fontsCancelled = false
    document.fonts?.ready
      .then(() => {
        if (!fontsCancelled) fitAll()
      })
      .catch(() => undefined)

    return () => {
      window.removeEventListener('resize', onResize)
      if (timer) clearTimeout(timer)
      fontsCancelled = true
    }
  }, [selector, resetKey])

  return ref
}
