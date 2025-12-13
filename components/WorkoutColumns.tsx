// File: components/WorkoutColumns.tsx
'use client'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { WorkoutColumnItem } from '@/types/index'
import EmptyStateDisplay from './shared/EmptyStateDisplay'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'

export interface WorkoutColumnsProps {
  columns: Array<{ title: string; items: WorkoutColumnItem[] }>
}

const WorkoutColumns = ({ columns }: WorkoutColumnsProps) => {
  if (!columns || columns.length === 0) {
    return (
      <Grid size={{ xs: 12 }}>
        <Paper sx={{ p: 3, mt: 2 }}>
          <EmptyStateDisplay
            icon={<FitnessCenterIcon />}
            message="No workout data is available to display."
          />
        </Paper>
      </Grid>
    )
  }

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
          <Paper sx={{ p: 3, minHeight: 200 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5 }}>
              {col.title}
            </Typography>
            {col.items.length > 0 ? (
              <Box sx={{ maxHeight: 300, overflowY: 'auto', pr: 1 }}>
                <Box component="ul" sx={{ m: 0, pl: 2 }}>
                  {col.items.map((it, i) => (
                    <Box key={i} component="li" sx={{ mb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
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
            ) : (
              <EmptyStateDisplay
                icon={<FitnessCenterIcon />}
                message="No exercises in this section."
              />
            )}
          </Paper>
        </Grid>
      ))}
    </Grid>
  )
}

export default WorkoutColumns
