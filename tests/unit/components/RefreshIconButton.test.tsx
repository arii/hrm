/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import RefreshIconButton from '../../../components/RefreshIconButton'
import { ThemeProvider, createTheme } from '@mui/material/styles'

const theme = createTheme()

describe('RefreshIconButton', () => {
  const handleClick = jest.fn()

  it('renders correctly with required props', () => {
    render(
      <ThemeProvider theme={theme}>
        <RefreshIconButton
          onClick={handleClick}
          aria-label="test refresh button"
        />
      </ThemeProvider>
    )

    const button = screen.getByRole('button', { name: /test refresh button/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveStyle({ width: '48px', height: '48px' })
  })

  it('calls onClick handler when clicked', () => {
    render(
      <ThemeProvider theme={theme}>
        <RefreshIconButton
          onClick={handleClick}
          aria-label="test refresh button"
        />
      </ThemeProvider>
    )

    const button = screen.getByRole('button', { name: /test refresh button/i })
    fireEvent.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('passes through additional props to the IconButton', () => {
    render(
      <ThemeProvider theme={theme}>
        <RefreshIconButton
          onClick={handleClick}
          aria-label="test refresh button"
          disabled
        />
      </ThemeProvider>
    )

    const button = screen.getByRole('button', { name: /test refresh button/i })
    expect(button).toBeDisabled()
  })
})
