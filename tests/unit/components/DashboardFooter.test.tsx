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
import DashboardMenu from '@/components/DashboardMenu'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'

jest.mock('@/hooks/useSpotifyAuth', () => ({ useSpotifyAuth: jest.fn() }))
jest.mock('@/hooks/useSpotifyCommand', () => ({ useSpotifyCommand: jest.fn() }))
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

const mockSpotifyAuth = jest.mocked(useSpotifyAuth)

describe('#9903 dashboard footer contract', () => {
  const hrmPlayer = {
    id: 'browser-player',
    name: 'HRM Web Player',
    is_active: false,
    is_private_session: false,
    is_restricted: false,
    type: 'Computer',
    volume_percent: 50,
  }
  const idlePlayer = () => ({
    execute: jest.fn(),
    activeDevice: null,
    hrmPlayer,
    playback: {
      track: { id: null, name: '', artist: '', albumName: '', albumArtUrl: '' },
      is_playing: false,
      isMuted: false,
      volume_percent: 50,
      progress_ms: 0,
    },
    isHrmPlayerActive: false,
  })
  beforeEach(() => {
    jest.clearAllMocks()
    mockSpotifyAuth.mockReturnValue({
      isLoggedIn: false,
      status: 'unauthenticated',
      session: null,
    })
    jest.mocked(useSpotifyCommand).mockReturnValue(idlePlayer())
  })

  it('offers the old manual transfer action only when recovery is available', async () => {
    mockSpotifyAuth.mockReturnValue({
      isLoggedIn: true,
      status: 'authenticated',
      session: { expires: '2099-01-01' },
    })
    const player = idlePlayer()
    jest.mocked(useSpotifyCommand).mockReturnValue(player)
    const user = userEvent.setup()
    render(<DashboardMenu showPlayerRetry />)
    await user.click(
      screen.getByRole('button', { name: 'Open dashboard menu' })
    )
    await user.click(
      screen.getByRole('menuitem', { name: 'Connect to HRM Web Player' })
    )
    expect(player.execute).toHaveBeenCalledWith('TRANSFER_PLAYBACK', {
      deviceId: 'browser-player',
    })
    expect(
      screen.getByRole('menuitem', { name: 'Connecting…' })
    ).toHaveAttribute('aria-disabled', 'true')
  })

  it.each([
    'pending',
    'logged out',
    'playing',
    'active device',
    'missing player',
  ])('does not offer manual recovery when %s', async (state) => {
    mockSpotifyAuth.mockReturnValue({
      isLoggedIn: state !== 'logged out',
      status: state === 'logged out' ? 'unauthenticated' : 'authenticated',
      session: null,
    })
    const player = idlePlayer()
    jest.mocked(useSpotifyCommand).mockReturnValue({
      ...player,
      activeDevice: state === 'active device' ? hrmPlayer : null,
      hrmPlayer: state === 'missing player' ? null : hrmPlayer,
      playback: { ...player.playback, is_playing: state === 'playing' },
    })
    const user = userEvent.setup()
    render(<DashboardMenu showPlayerRetry={state !== 'pending'} />)
    await user.click(
      screen.getByRole('button', { name: 'Open dashboard menu' })
    )
    expect(
      screen.queryByRole('menuitem', { name: 'Connect to HRM Web Player' })
    ).not.toBeInTheDocument()
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
    mockSpotifyAuth.mockReturnValue({
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
