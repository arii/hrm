// components/AuthButton.tsx
'use client';

import React, { useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Button from '@mui/material/Button';
import LogoutConfirmationDialog from './LogoutConfirmationDialog';
import SpotifyLoginButton from './SpotifyLoginButton';

const AuthButton: React.FC = () => {
  const { data: session, status } = useSession();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleLogoutClick = () => {
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleConfirmLogout = () => {
    signOut({ redirect: false });
    setDialogOpen(false);
  };

  if (status === 'loading') {
    return (
      <Button variant="outlined" size="small" disabled>
        Loading...
      </Button>
    );
  }

  if (session) {
    return (
      <>
        <Button
          variant="outlined"
          size="small"
          onClick={handleLogoutClick}
          sx={{
            color: 'common.white',
            borderColor: (theme) => theme.palette.grey[600],
            '&:hover': {
              borderColor: (theme) => theme.palette.grey[500],
              backgroundColor: (theme) => theme.palette.grey[800],
            },
            minWidth: 'auto',
            px: 1.5,
            fontSize: '0.75rem',
          }}
        >
          Logout
        </Button>
        <LogoutConfirmationDialog
          open={dialogOpen}
          onClose={handleDialogClose}
          onConfirm={handleConfirmLogout}
        />
      </>
    );
  }

  return <SpotifyLoginButton />;
};

export default AuthButton;
