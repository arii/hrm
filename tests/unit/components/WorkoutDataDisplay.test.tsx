/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import WorkoutDataDisplay from '@/components/WorkoutDataDisplay'
import '@testing-library/jest-dom'
import { ThemeProvider } from '@mui/material/styles'
import { createTheme } from '@mui/material'

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

  // Note: JSDOM does not support layout or rendering, so we can't directly test
  // the visual stacking. Instead, we'd need visual regression tests or E2E tests
  // to confirm the responsive behavior. This test is a placeholder for that concept.
  it('is structured to allow responsive stacking', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <WorkoutDataDisplay calories={100} duration="01:00" />
      </ThemeProvider>
    )
    // Check for the presence of the main container
    expect(container.firstChild).toBeInTheDocument()
  })
})
