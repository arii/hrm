import React from 'react'
import { Box, Typography } from '@mui/material'
import DashboardWidget from './DashboardWidget'

interface DataWidgetProps {
  title: string
  value: string | number
  unit?: string
}

const DataWidget: React.FC<DataWidgetProps> = ({ title, value, unit }) => {
  return (
    <DashboardWidget>
      <Typography variant="h6" color="text.secondary">
        {title}
      </Typography>
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="h2" component="div" sx={{ fontWeight: 'bold' }}>
          {value || '0'}
          {unit && (
            <Typography
              variant="h5"
              component="span"
              color="text.secondary"
              sx={{ ml: 1 }}
            >
              {unit}
            </Typography>
          )}
        </Typography>
      </Box>
    </DashboardWidget>
  )
}

export default DataWidget
