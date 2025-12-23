// utils/volume.ts
export const clampVolume = (value: number): number =>
  Math.min(100, Math.max(0, Math.round(value)))
