'use client'

import { createTheme } from '@mui/material/styles'
import libTheme from '@/lib/theme'
import { HR_COLORS } from '@/lib/shared/colors'

const theme = createTheme(libTheme, {
  palette: {
    custom: {
      running: HR_COLORS.ZONE_5_PEAK,
      idle: HR_COLORS.ZONE_0_IDLE,
      paused: HR_COLORS.ZONE_4_CARDIO,
      finished: HR_COLORS.ZONE_3_FATBURN,
      prepare: HR_COLORS.ZONE_4_CARDIO,
      work: HR_COLORS.ZONE_5_PEAK,
      rest: HR_COLORS.ZONE_3_FATBURN,
      cooldown: HR_COLORS.ZONE_2_WARMUP,
    },
  },
})

export default theme
