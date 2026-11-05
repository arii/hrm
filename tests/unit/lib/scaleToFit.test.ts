import { computeScaleToFit, shouldScaleToFit } from '@/lib/scaleToFit'

describe('computeScaleToFit', () => {
  const DESIGN_WIDTH = 1440
  const DESIGN_HEIGHT = 900

  it('returns 1 when the viewport matches the design size', () => {
    expect(computeScaleToFit(1440, 900, DESIGN_WIDTH, DESIGN_HEIGHT)).toBe(1)
  })

  it('fits by height when the viewport is wider than the design aspect', () => {
    // 1920x1080 VRT desktop viewport: min(1920/1440, 1080/900) = 1.2
    expect(
      computeScaleToFit(1920, 1080, DESIGN_WIDTH, DESIGN_HEIGHT)
    ).toBeCloseTo(1.2, 10)
  })

  it('fits by width when the viewport is narrower than the design aspect', () => {
    // Zoomed-in verification viewport: min(1246/1440, 615/900) = 615/900
    expect(
      computeScaleToFit(1246, 615, DESIGN_WIDTH, DESIGN_HEIGHT)
    ).toBeCloseTo(615 / 900, 10)
  })

  it('falls back to 1 for non-positive or non-finite inputs', () => {
    expect(computeScaleToFit(0, 900, DESIGN_WIDTH, DESIGN_HEIGHT)).toBe(1)
    expect(computeScaleToFit(1440, 0, DESIGN_WIDTH, DESIGN_HEIGHT)).toBe(1)
    expect(computeScaleToFit(-5, 900, DESIGN_WIDTH, DESIGN_HEIGHT)).toBe(1)
    expect(
      computeScaleToFit(Number.NaN, 900, DESIGN_WIDTH, DESIGN_HEIGHT)
    ).toBe(1)
    expect(computeScaleToFit(1440, 900, 0, DESIGN_HEIGHT)).toBe(1)
    expect(computeScaleToFit(1440, 900, DESIGN_WIDTH, 0)).toBe(1)
  })
})

describe('shouldScaleToFit', () => {
  const MIN_WIDTH = 600

  it('enables scaling at and above the minimum width', () => {
    expect(shouldScaleToFit(600, MIN_WIDTH)).toBe(true)
    expect(shouldScaleToFit(1246, MIN_WIDTH)).toBe(true)
    expect(shouldScaleToFit(1920, MIN_WIDTH)).toBe(true)
  })

  it('keeps the responsive layout below the minimum width', () => {
    expect(shouldScaleToFit(599, MIN_WIDTH)).toBe(false)
    expect(shouldScaleToFit(375, MIN_WIDTH)).toBe(false)
  })
})
