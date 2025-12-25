import React, { FC, ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ThemeProvider, createTheme } from '@mui/material/styles'

const mockTheme = createTheme({
  palette: {
    secondary: { main: '#dc004e' },
    success: { main: '#388e3c' },
    warning: { main: '#f57c00', dark: '#f57c00' },
    primary: { main: '#1976d2' },
  },
  transitions: {
    create: () => 'none',
    duration: {
      short: 250,
    },
  },
})

const AllTheProviders: FC<{ children: React.ReactNode }> = ({ children }) => {
  return <ThemeProvider theme={mockTheme}>{children}</ThemeProvider>
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }
