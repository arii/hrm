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
    }
  }

  interface Typography {
    fontFamilyMono: string
  }

  interface TypographyOptions {
    fontFamilyMono?: string
  }

  interface TypographyVariants {
    fontFamilyMono: string
  }

  interface TypographyVariantsOptions {
    fontFamilyMono?: string
  }
}
