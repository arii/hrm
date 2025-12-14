/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import WorkoutDataDisplay from '@/components/WorkoutDataDisplay'

// Mock the theme
const theme = createTheme()

describe('WorkoutDataDisplay', () => {
  it('renders calories and duration correctly', () => {
    render(
      <ThemeProvider theme={theme}>
        <WorkoutDataDisplay calories={150} duration="02:30" />
      </ThemeProvider>
    )
    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('kcal')).toBeInTheDocument()
    expect(screen.getByText('02:30')).toBeInTheDocument()
  })

  it('displays fire icon with correct color', () => {
    render(
      <ThemeProvider theme={theme}>
        <WorkoutDataDisplay calories={100} duration="01:00" />
      </ThemeProvider>
    )
    const icon = screen.getByTestId('WhatshotIcon')
    // The color="error" prop translates to this class
    expect(icon).toHaveClass('MuiSvgIcon-colorError')
  })
})
