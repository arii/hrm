// components/AuthButton.tsx
'use client'

import { useState } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import CircularProgress from '@mui/material/CircularProgress'

const AuthButton = () => {
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleClickOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await signOut({ callbackUrl: '/' })
  }

  if (status === 'loading') {
    return <CircularProgress size={24} />
  }

  if (session) {
    return (
      <>
        <Button
          color="inherit"
          onClick={handleClickOpen}
          disabled={isLoggingOut}
          aria-label="Logout"
        >
          {isLoggingOut ? <CircularProgress size={24} /> : 'Logout'}
        </Button>
        <Dialog open={open} onClose={handleClose}>
          <DialogTitle>Confirm Logout</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to log out?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button onClick={handleLogout} color="error" autoFocus>
              Logout
            </Button>
          </DialogActions>
        </Dialog>
      </>
    )
  }

  return (
    <Button color="inherit" onClick={() => signIn('spotify')}>
      Login with Spotify
    </Button>
  )
}

export default AuthButton
