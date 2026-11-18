/** @jest-environment jsdom */
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { signIn, signOut } from 'next-auth/react'
import { FooterStack } from '@/app/main'
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth'

jest.mock('@/hooks/useSpotifyAuth', () => ({ useSpotifyAuth: jest.fn() }))
jest.mock('next/navigation', () => ({
  usePathname: () => '/client/control',
}))
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
}))
jest.mock('@/components/SpotifyDisplay', () => ({
  __esModule: true,
  default: () => <div data-testid="mounted-player">Spotify player UI</div>,
}))

describe('#9903 dashboard footer contract', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(useSpotifyAuth).mockReturnValue({
      isLoggedIn: false,
      status: 'unauthenticated',
      session: null,
    })
  })

  it('hides dashboard footer UI but keeps the player mounted', async () => {
    render(<FooterStack pageMotion={<div>Workout</div>} isDashboard />)
    expect(screen.getByText('Workout')).toBeVisible()
    expect(screen.queryByTestId('bottom-nav-bar')).not.toBeInTheDocument()
    expect(screen.queryByTestId('footer')).not.toBeInTheDocument()
    expect(await screen.findByTestId('mounted-player')).not.toBeVisible()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('opens exactly the requested links and login, supports Escape and focus return', async () => {
    const user = userEvent.setup()
    render(<FooterStack pageMotion={<div />} isDashboard />)
    const toggle = screen.getByRole('button', { name: 'Open dashboard menu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    toggle.focus()
    await user.keyboard('{Enter}')
    const menu = screen.getByRole('menu')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const links = [
      ['Controls', '/client/control'],
      ['Stream', '/client/connect'],
      ['Spotify', '/client/spotify-selection'],
      ['Experiments', '/client/experimental'],
      ['Profile', '/client/settings'],
    ]
    for (const [name, href] of links) {
      expect(within(menu).getByRole('menuitem', { name })).toHaveAttribute(
        'href',
        href
      )
    }
    expect(within(menu).getAllByRole('menuitem')).toHaveLength(6)
    expect(
      within(menu).getByRole('menuitem', { name: 'Login with Spotify' })
    ).toBeVisible()
    await user.keyboard('{Escape}')
    await waitFor(() =>
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    )
    expect(toggle).toHaveFocus()
  })

  it('uses the existing Spotify login action', async () => {
    const user = userEvent.setup()
    render(<FooterStack pageMotion={<div />} isDashboard />)
    await user.click(
      screen.getByRole('button', { name: 'Open dashboard menu' })
    )
    await user.click(
      screen.getByRole('menuitem', { name: 'Login with Spotify' })
    )
    expect(signIn).toHaveBeenCalledWith(
      'spotify',
      expect.objectContaining({ redirect: true })
    )
  })

  it('replaces login with the existing logout action for signed-in owners', async () => {
    jest.mocked(useSpotifyAuth).mockReturnValue({
      isLoggedIn: true,
      status: 'authenticated',
      session: { expires: '2099-01-01' },
    })
    jest.mocked(signOut).mockImplementation(() => new Promise(() => {}))
    render(<FooterStack pageMotion={<div />} isDashboard />)
    fireEvent.click(screen.getByRole('button', { name: 'Open dashboard menu' }))
    expect(
      screen.queryByRole('menuitem', { name: 'Login with Spotify' })
    ).not.toBeInTheDocument()
    expect(screen.getAllByRole('menuitem')).toHaveLength(6)
    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Log out of Spotify' })
    )
    expect(signOut).toHaveBeenCalledWith({ redirect: false })
  })

  it('keeps the existing nav and footer on Controls with no hamburger', async () => {
    render(<FooterStack pageMotion={<div />} isDashboard={false} />)
    expect(screen.getByTestId('bottom-nav-bar')).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'Navigate to Dashboard page' })
    ).toHaveAttribute('href', '/')
    expect(screen.getByTestId('footer')).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Open dashboard menu' })
    ).not.toBeInTheDocument()
    expect(await screen.findByTestId('mounted-player')).not.toBeVisible()
  })
})
