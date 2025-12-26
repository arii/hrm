// lib/theme.ts
import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    timer: {
      prepare: '#F59E0B', // Yellow/Warning
      work: '#EF4444', // Red
      rest: '#22C55E', // Green
      cooldown: '#3B82F6', // Blue
      idle: '#6B7280', // Gray
      stopwatch: '#2563EB', // Blue/Primary
    },
  },
})

export default theme
