'use client'

import { createTheme } from '@mui/material/styles'
import libTheme from '@/lib/theme'
import { HR_COLORS } from '@/lib/shared/colors'

const theme = createTheme(libTheme, {
  palette: {
    custom: {
      running: HR_COLORS.ZONE_3_FATBURN, // Green
      idle: HR_COLORS.ZONE_0_IDLE, // Grey
      paused: HR_COLORS.ZONE_4_CARDIO, // Amber/Yellow
      finished: HR_COLORS.ZONE_2_WARMUP, // Blue
      prepare: '#f59e0b', // Amber
      work: '#ef4444', // Red
      rest: '#22c55e', // Green
      cooldown: '#6b7280', // Grey
    },
  },
})

export default theme
