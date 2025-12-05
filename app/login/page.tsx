// app/login/page.tsx
'use client';

import { useSpotifyAuth } from '../../hooks/useSpotifyAuth';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function LoginPage() {
  const { login } = useSpotifyAuth();

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
    >
      <Typography variant="h4" gutterBottom>
        Login with Spotify
      </Typography>
      <Button variant="contained" color="primary" onClick={login}>
        Login
      </Button>
    </Box>
  );
}
