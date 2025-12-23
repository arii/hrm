// components/AuthButton.tsx
'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import { useSnackbar } from '@/context/SnackbarContext'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

const AuthButton = () => {
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)
  const { openSnackbar } = useSnackbar()

  const handleLogin = async () => {
    try {
      const result = await signIn('spotify')
      if (result?.error) {
        openSnackbar(`Error: ${result.error}`, 'error')
      }
    } catch (error) {
      console.error('Login failed:', error)
      openSnackbar('An unexpected error occurred during login.', 'error')
    }
  }

  const handleLogoutClick = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  const handleConfirmLogout = () => {
    signOut()
    setOpen(false)
  }

  if (status === 'loading') {
    return (
      <Button variant="contained" disabled aria-live="polite">
        <CircularProgress size={24} />
      </Button>
    )
  }

  if (session) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="body1">
          Logged in as {session.user?.name}
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          onClick={handleLogoutClick}
        >
          Logout
        </Button>
        <Dialog
          open={open}
          onClose={handleClose}
          aria-labelledby="logout-dialog-title"
          aria-describedby="logout-dialog-description"
        >
          <DialogTitle id="logout-dialog-title">{'Confirm Logout'}</DialogTitle>
          <DialogContent>
            <DialogContentText id="logout-dialog-description">
              Are you sure you want to log out?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button onClick={handleConfirmLogout} color="primary" autoFocus>
              Logout
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    )
  }

  return (
    <Button
      variant="contained"
      color="primary"
      onClick={handleLogin}
    >
      Login with Spotify
    </Button>
  )
}

export default AuthButton
