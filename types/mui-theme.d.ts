import '@mui/material/styles'

declare module '@mui/material/styles' {
  interface Palette {
    custom: {
      prepare: string
      work: string
      rest: string
      running: string
      idle: string
      cooldown: string
      warmUp: string
      fatBurn: string
      cardio: string
      peak: string
      max: string
      resting: string
    }
  }
  interface PaletteOptions {
    custom?: {
      prepare?: string
      work?: string
      rest?: string
      running?: string
      idle?: string
      cooldown?: string
      warmUp?: string
      fatBurn?: string
      cardio?: string
      peak?: string
      max?: string
      resting?: string
    }
  }
}
