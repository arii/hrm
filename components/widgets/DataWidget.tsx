// File: components/widgets/DataWidget.tsx
import React from 'react'
import { Typography, Box } from '@mui/material'
import DashboardWidget from './DashboardWidget'

interface DataWidgetProps {
  title: string
  data: { label: string; value: string | number }[]
}

const DataWidget: React.FC<DataWidgetProps> = ({ title, data }) => {
  return (
    <DashboardWidget title={title}>
      {data.map((item, index) => (
        <Box
          key={index}
          sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}
        >
          <Typography variant="body1">{item.label}</Typography>
          <Typography variant="body1">{item.value}</Typography>
        </Box>
      ))}
    </DashboardWidget>
  )
}

export default DataWidget
