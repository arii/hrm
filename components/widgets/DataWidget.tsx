// components/widgets/DataWidget.tsx
import React from 'react'
import { Box, Typography } from '@mui/material'

interface DataWidgetProps {
  label: string
  value: string | number
}

const DataWidget: React.FC<DataWidgetProps> = ({ label, value }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        py: 1,
      }}
    >
      <Typography variant="body1">{label}</Typography>
      <Typography variant="h6">{value}</Typography>
    </Box>
  )
}

export default DataWidget
