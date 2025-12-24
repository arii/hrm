// Helper to convert hex to RGBA
export const hexToRgba = (hex: string, alpha: number) => {
  if (!/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    return `rgba(0, 0, 0, ${alpha})` // Return a default color for invalid hex
  }
  let c = hex.substring(1).split('')
  if (c.length === 3) {
    const c0 = c[0]
    const c1 = c[1]
    const c2 = c[2]
    if (c0 && c1 && c2) {
      c = [c0, c0, c1, c1, c2, c2]
    }
  }
  const i = parseInt(c.join(''), 16)
  const r = (i >> 16) & 255
  const g = (i >> 8) & 255
  const b = i & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
