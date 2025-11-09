"use client";

import { Box, Button, Paper, Typography } from "@mui/material";
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function SpotifyDebugPage() {
  const { data: session } = useSession();
  const [serverToken, setServerToken] = useState<any>(null);

  const fetchServerToken = async () => {
    const res = await fetch("/api/debug/spotify-token");
    if (res.ok) {
      const data = await res.json();
      setServerToken(data.token);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchServerToken();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Spotify Debug
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">NextAuth Session</Typography>
        {session ? (
          <>
            <pre>{JSON.stringify(session, null, 2)}</pre>
            <Button onClick={() => signOut()}>Sign Out</Button>
          </>
        ) : (
          <Button onClick={() => signIn("spotify")}>
            Sign In with Spotify
          </Button>
        )}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Server Token Status</Typography>
        <Button onClick={fetchServerToken} sx={{ mb: 2 }}>
          Refresh
        </Button>
        <pre>{JSON.stringify(serverToken, null, 2)}</pre>
      </Paper>
    </Box>
  );
}
