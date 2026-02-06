import '@mui/material/styles'

declare module '@mui/material/styles' {
  interface CustomColors {
    prepare: string
    work: string
    rest: string
    running: string
    idle: string
    cooldown: string
  }

  interface Palette {
    custom: CustomColors
  }
  interface PaletteOptions {
    custom?: Partial<CustomColors>
  }

  // NOTE: In MUI v5+, Theme['typography'] is defined as TypographyVariants
  // We must extend TypographyVariants to add properties to theme.typography,
  // even if they are just strings (not full variant objects).
  interface TypographyVariants {
    fontFamilyMono: string
  }

  interface TypographyVariantsOptions {
    fontFamilyMono?: string
  }
}
