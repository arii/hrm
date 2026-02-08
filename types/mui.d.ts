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

  // NOTE: In MUI v5+, Theme['typography'] is defined as TypographyVariants
  // We must extend TypographyVariants to add properties to theme.typography,
  // even if they are just strings (not full variant objects).
  // Although extending Typography is preferred, it's not exported by default in this version of MUI.
  interface TypographyVariants {
    fontFamilyMono: string
  }

  interface TypographyVariantsOptions {
    fontFamilyMono?: string
  }
}
