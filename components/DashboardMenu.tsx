'use client'

import { useState } from 'react'
import Link from 'next/link'
import MenuIcon from '@mui/icons-material/Menu'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import AuthButton from '@/components/AuthButton'
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth'
import { logoutSpotify } from '@/lib/spotify/logout'

const LINKS = [
  ['Controls', '/client/control'],
  ['Stream', '/client/connect'],
  ['Spotify', '/client/spotify-selection'],
  ['Experiments', '/client/experimental'],
  ['Profile', '/client/settings'],
] as const

export default function DashboardMenu() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const { isLoggedIn } = useSpotifyAuth()
  const close = () => setAnchor(null)

  return (
    <>
      <IconButton
        aria-label="Open dashboard menu"
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        aria-controls={anchor ? 'dashboard-menu' : undefined}
        onClick={(event) => setAnchor(event.currentTarget)}
        sx={{
          position: 'fixed',
          bottom: 2,
          right: 2,
          width: 28,
          height: 28,
          color: 'text.secondary',
          opacity: 0.35,
          '&:hover, &.Mui-focusVisible': { opacity: 1 },
          '&.Mui-focusVisible': { outline: '2px solid currentColor' },
        }}
      >
        <MenuIcon sx={{ fontSize: 20 }} />
      </IconButton>
      <Menu
        id="dashboard-menu"
        anchorEl={anchor}
        open={!!anchor}
        onClose={close}
        disableScrollLock
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {LINKS.map(([label, href]) => (
          <MenuItem key={href} component={Link} href={href} onClick={close}>
            {label}
          </MenuItem>
        ))}
        {isLoggedIn ? (
          <MenuItem onClick={logoutSpotify}>Log out of Spotify</MenuItem>
        ) : (
          <AuthButton providerId="spotify" providerName="Spotify" menuItem />
        )}
      </Menu>
    </>
  )
}
