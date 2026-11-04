// tests/unit/lib/theme.test.ts
/** @jest-environment node */

import theme from '@/lib/theme'
import { HR_ZONE_CONFIG, HR_ZONE_ORDER } from '@/lib/shared/hr-zones'
import { HR_COLORS } from '@/lib/shared/colors'

// WCAG relative luminance + contrast ratio (same math browsers use).
const luminance = (hex: string): number => {
  const rgb = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
}

const contrastRatio = (a: string, b: string): number => {
  const [lo, hi] = [luminance(a), luminance(b)].sort((x, y) => x - y)
  return (hi + 0.05) / (lo + 0.05)
}

describe('Phase 1 theme foundation', () => {
  it('keeps the plan typography scale (h1 4rem/700, h2 2.5rem/600)', () => {
    expect(theme.typography.h1.fontSize).toBe('4rem')
    expect(theme.typography.h1.fontWeight).toBe(700)
    expect(theme.typography.h2.fontSize).toBe('2.5rem')
    expect(theme.typography.h2.fontWeight).toBe(600)
  })

  it('provides a visible 2px focus ring for keyboard users', () => {
    const overrides = theme.components?.MuiCssBaseline
      ?.styleOverrides as unknown as (
      t: typeof theme
    ) => Record<string, Record<string, string>>
    expect(typeof overrides).toBe('function')
    const css = overrides(theme)
    expect(css['*:focus-visible']).toMatchObject({
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: '2px',
    })
  })

  it('uses dark text on amber Cardio and green Fat Burn zones (normal-text AA)', () => {
    for (const zone of ['ZONE_3', 'ZONE_4'] as const) {
      const config = HR_ZONE_CONFIG[zone]
      expect(config.textColor).toBe(HR_COLORS.TEXT_DARK)
      expect(
        contrastRatio(config.color, config.textColor)
      ).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('keeps every zone text/background pair at large-text AA (3:1)', () => {
    const failures = HR_ZONE_ORDER.map((zone) => {
      const config = HR_ZONE_CONFIG[zone]
      const ratio = contrastRatio(config.color, config.textColor)
      return { zone, ratio: Number(ratio.toFixed(2)) }
    }).filter((entry) => entry.ratio < 3.0)
    expect(failures).toEqual([])
  })

  it('enforces 48px touch targets on buttons and icon buttons', () => {
    const buttonRoot = theme.components?.MuiButton
      ?.styleOverrides as unknown as {
      root: { minHeight: number }
    }
    expect(buttonRoot.root.minHeight).toBe(48)
    const iconButtonRoot = theme.components?.MuiIconButton
      ?.styleOverrides as unknown as { root: { width: number; height: number } }
    expect(iconButtonRoot.root.width).toBe(48)
    expect(iconButtonRoot.root.height).toBe(48)
  })
})
