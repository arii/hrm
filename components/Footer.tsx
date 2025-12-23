'use client'

import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import {
  Box,
  Container,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material'
import { FC } from 'react'

import { useTheme } from '@/context/ThemeContext'

/**
 * The `Footer` component.
 */
const Footer: FC = () => {
  const currentYear = new Date().getFullYear()

  const { themeMode, toggleThemeMode } = useTheme()

  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: (theme) =>
          theme.palette.mode === 'light'
            ? theme.palette.grey[200]
            : theme.palette.grey[800],
      }}
    >
      <Container
        maxWidth="xl"
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          © {currentYear} HRM Dashboard. All rights reserved.
        </Typography>
        <Tooltip
          title={`Toggle ${themeMode === 'light' ? 'dark' : 'light'} mode`}
        >
          <IconButton onClick={toggleThemeMode} color="inherit">
            {themeMode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Tooltip>
      </Container>
    </Box>
  )
}

export default Footer
