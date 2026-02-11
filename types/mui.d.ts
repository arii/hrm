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
    custom?: Partial<Palette['custom']>
  }

  interface TypographyVariants {
    fontFamilyMono: string
  }

  interface TypographyVariantsOptions {
    fontFamilyMono?: string
  }
}
