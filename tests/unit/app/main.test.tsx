/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { FooterStack } from '@/app/main'

jest.mock('@/components/SpotifyDisplay', () => {
  const SpotifyDisplay = () => <div data-testid="spotify-display" />
  SpotifyDisplay.displayName = 'SpotifyDisplay'
  return SpotifyDisplay
})
jest.mock('@/components/Footer', () => {
  const Footer = () => <div data-testid="footer" />
  Footer.displayName = 'Footer'
  return Footer
})
jest.mock('@/components/BottomNavBar', () => {
  const BottomNavBar = () => <div data-testid="bottom-nav-bar" />
  BottomNavBar.displayName = 'BottomNavBar'
  return BottomNavBar
})

describe('FooterStack', () => {
  it('renders page content plus footer and nav', () => {
    render(<FooterStack pageMotion={<div data-testid="page" />} isDashboard />)
    expect(screen.getByTestId('page')).toBeInTheDocument()
    expect(screen.getByTestId('footer')).toBeInTheDocument()
    expect(screen.getByTestId('bottom-nav-bar')).toBeInTheDocument()
  })

  it('loads the Spotify bar through the dynamic import', async () => {
    render(<FooterStack pageMotion={<div data-testid="page" />} isDashboard />)
    // next/dynamic with ssr:false mounts after the client effect.
    expect(await screen.findByTestId('spotify-display')).toBeInTheDocument()
  })

  it('shows the Spotify wrapper on the dashboard route', async () => {
    render(<FooterStack pageMotion={<div data-testid="page" />} isDashboard />)
    expect(await screen.findByTestId('spotify-display')).toBeVisible()
    expect(screen.getByTestId('global-spotify-footer-wrapper')).toBeVisible()
  })

  it('hides the Spotify wrapper off-dashboard while keeping it mounted', async () => {
    render(
      <FooterStack
        pageMotion={<div data-testid="page" />}
        isDashboard={false}
      />
    )
    // Still mounted so audio playback never drops across tab navigation.
    expect(await screen.findByTestId('spotify-display')).toBeInTheDocument()
    expect(
      screen.getByTestId('global-spotify-footer-wrapper')
    ).not.toBeVisible()
  })
})
