// Helper to convert hex to RGBA
export const hexToRgba = (hex: string, alpha: number) => {
  if (!/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    return `rgba(0, 0, 0, ${alpha})` // Return a default color for invalid hex
  }
  let c = hex.substring(1).split('')
  if (c.length === 3) {
    c = [c[0], c[0], c[1], c[1], c[2], c[2]]
  }
  const i = parseInt(c.join(''), 16)
  const r = (i >> 16) & 255
  const g = (i >> 8) & 255
  const b = i & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
