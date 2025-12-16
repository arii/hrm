// File: components/WorkoutColumns.tsx
'use client'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { WorkoutColumnItem } from '@/types/index'

export interface WorkoutColumnsProps {
  columns: Array<{ title: string; items: WorkoutColumnItem[] }>
}

const WorkoutColumns = ({ columns }: WorkoutColumnsProps) => {
  return (
    <Grid container spacing={2}>
      {columns.map((col, idx) => (
        <Grid
          key={idx}
          size={{
            xs: 12,
            sm: 6,
            md: Math.max(12 / columns.length, 3),
          }}
        >
          <Paper sx={{ p: 3 }}>
            {' '}
            {/* Increased padding */}
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5 }}>
              {' '}
              {/* Larger font, increased margin */}
              {col.title}
            </Typography>
            <Box sx={{ maxHeight: 300, overflowY: 'auto', pr: 1 }}>
              {' '}
              {/* Added max height and scroll */}
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                {col.items.map((it, i) => (
                  <Box key={i} component="li" sx={{ mb: 1 }}>
                    {' '}
                    {/* Increased margin bottom */}
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {' '}
                      {/* Larger font */}
                      {it.title}
                    </Typography>
                    {it.details && (
                      <Typography variant="body2" color="text.secondary">
                        {it.details}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  )
}
