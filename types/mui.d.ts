import '@mui/material/styles'

declare module '@mui/material/styles' {
  interface Palette {
    overlay: string
  }
  interface PaletteOptions {
    overlay?: string
  }
  interface TypeBackground {
    overlay?: string
  }
  interface ZIndex {
    loadingIndicator: number
  }
}
