/**
 * @jest-environment jsdom
 */
import BottomNavBar from '@/components/BottomNavBar'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { usePathname } from 'next/navigation'
import { ThemeProvider, createTheme } from '@mui/material/styles'

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

jest.mock('next/link', () => {
  return ({ children, href, ...rest }: any) => {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    )
  }
})

const theme = createTheme()

describe('BottomNavBar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const renderWithTheme = (ui: React.ReactElement) => {
    return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)
  }

  it('renders all navigation items', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/')
    renderWithTheme(<BottomNavBar />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Controls')).toBeInTheDocument()
    expect(screen.getByText('Stream')).toBeInTheDocument()
    expect(screen.getByText('Spotify')).toBeInTheDocument()
    expect(screen.getByText('Analytics')).toBeInTheDocument()
  })

  it('highlights Dashboard when on the root path', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/')
    renderWithTheme(<BottomNavBar />)

    const dashboardAction = screen.getByLabelText('Navigate to Dashboard page')
    // MUI uses classes for styling, so computed style is better
    expect(dashboardAction).toHaveStyle(`color: ${theme.palette.primary.main}`)
  })

  it('highlights Spotify when on /client/spotify-selection', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/client/spotify-selection')
    renderWithTheme(<BottomNavBar />)

    const spotifyAction = screen.getByLabelText('Navigate to Spotify Selection page')
    expect(spotifyAction).toHaveStyle(`color: ${theme.palette.primary.main}`)
  })

  it('highlights Analytics when on /client/experimental', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/client/experimental')
    renderWithTheme(<BottomNavBar />)

    const analyticsAction = screen.getByLabelText('Navigate to Experimental Analytics page')
    expect(analyticsAction).toHaveStyle(`color: ${theme.palette.primary.main}`)
  })

  it('highlights Analytics when on a subpath of /client/experimental', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/client/experimental/deep-dive')
    renderWithTheme(<BottomNavBar />)

    const analyticsAction = screen.getByLabelText('Navigate to Experimental Analytics page')
    expect(analyticsAction).toHaveStyle(`color: ${theme.palette.primary.main}`)
  })

  it('defaults to Dashboard (index 0) when path does not match any items', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/unknown-path')
    renderWithTheme(<BottomNavBar />)

    const dashboardAction = screen.getByLabelText('Navigate to Dashboard page')
    expect(dashboardAction).toHaveStyle(`color: ${theme.palette.primary.main}`)
  })
})
