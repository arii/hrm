// components/widgets/DashboardWidget.tsx
import React from 'react'
import { Paper, Typography, Box } from '@mui/material'

interface DashboardWidgetProps {
  title: string
  children: React.ReactNode
}

const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  title,
  children,
}) => {
  return (
    <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" component="h2" gutterBottom>
        {title}
      </Typography>
      <Box>{children}</Box>
    </Paper>
  )
}

export default DashboardWidget
