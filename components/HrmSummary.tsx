// File: components/HrmSummary.tsx
'use client'
import { useMemo } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Grid from '@mui/material/Grid'
import { HrmDataPoint } from '../services/hrmDataService'

interface HrmSummaryProps {
  data: HrmDataPoint[]
}

const HrmSummary = ({ data }: HrmSummaryProps) => {
  const summary = useMemo(() => {
    if (data.length === 0) {
      return { avg: 0, max: 0, min: 0 }
    }

    const hrmValues = data.map((d) => d.hrm)
    const max = Math.max(...hrmValues)
    const min = Math.min(...hrmValues)
    const avg = Math.round(hrmValues.reduce((a, b) => a + b, 0) / hrmValues.length)

    return { avg, max, min }
  }, [data])

  return (
    <Paper elevation={3} sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Session Summary
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={4}>
          <Box textAlign="center">
            <Typography variant="h4">{summary.avg}</Typography>
            <Typography variant="caption">Average BPM</Typography>
          </Box>
        </Grid>
        <Grid item xs={4}>
          <Box textAlign="center">
            <Typography variant="h4">{summary.max}</Typography>
            <Typography variant="caption">Max BPM</Typography>
          </Box>
        </Grid>
        <Grid item xs={4}>
          <Box textAlign="center">
            <Typography variant="h4">{summary.min}</Typography>
            <Typography variant="caption">Min BPM</Typography>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  )
}

export default HrmSummary
