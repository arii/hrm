// components/AuthButton.tsx
'use client'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useState } from 'react'

const AuthButton = () => {
  const { status } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const handleClickOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  const handleLogin = async () => {
    setIsLoading(true)
    try {
      await signIn('spotify', { callbackUrl: '/', redirect: true })
    } catch (error) {
      console.error('Login failed', error)
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    handleClose()
    setIsLoading(true)
    try {
      await signOut({ callbackUrl: '/' })
    } catch (error) {
      console.error('Logout failed', error)
      setIsLoading(false)
    }
  }

  if (status === 'authenticated') {
    return (
      <>
        <Button
          variant="outlined"
          size="small"
          onClick={handleClickOpen}
          disabled={isLoading}
          aria-label={isLoading ? 'Attempting to log out' : 'Logout'}
          sx={{
            color: 'common.white',
            borderColor: 'grey.600',
            '&:hover': {
              borderColor: 'grey.500',
              backgroundColor: 'grey.800',
            },
            minWidth: 'auto',
            px: 1.5,
          }}
        >
          {isLoading ? 'Logging out...' : 'Logout'}
        </Button>
        <Dialog
          open={open}
          onClose={handleClose}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title">{'Confirm Logout'}</DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              Are you sure you want to log out?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} color="primary">
              Cancel
            </Button>
            <Button onClick={handleLogout} color="primary" autoFocus>
              Logout
            </Button>
          </DialogActions>
        </Dialog>
      </>
    )
  }

  return (
    <Button
      variant="contained"
      color="primary"
      onClick={handleLogin}
      disabled={isLoading || status === 'loading'}
      aria-label={
        isLoading || status === 'loading'
          ? 'Attempting to log in with Spotify'
          : 'Login with Spotify'
      }
    >
      {isLoading || status === 'loading' ? 'Loading...' : 'Login with Spotify'}
    </Button>
  )
}

export default AuthButton
