// File: components/WorkoutColumns.tsx
"use client";
import { Box, Grid, Paper, Typography } from "@mui/material";

export interface WorkoutItem {
  title: string;
  details?: string;
}

export interface WorkoutColumnsProps {
  columns: Array<{ title: string; items: WorkoutItem[] }>;
}

const WorkoutColumns = ({ columns }: WorkoutColumnsProps) => {
  return (
    <Grid container spacing={2}>
      {columns.map((col, idx) => (
        <Grid
          key={idx}
          item
          xs={12}
          sm={6}
          md={Math.max(12 / columns.length, 3)}
        >
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              {col.title}
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              {col.items.map((it, i) => (
                <Box key={i} component="li" sx={{ mb: 0.5 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
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
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};

export default WorkoutColumns;
