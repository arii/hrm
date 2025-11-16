'use client'

import theme from "@/lib/theme";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "../hooks/useAuth";
import { SocketProvider } from "../hooks/useSocket";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthProvider>
        <SocketProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </SocketProvider>
      </AuthProvider>
    </SessionProvider>
  )
}
