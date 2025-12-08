// File: components/widgets/DashboardWidget.tsx
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import type { ReactNode } from 'react'

interface DashboardWidgetProps {
  title: string
  children: ReactNode
}

const DashboardWidget = ({ title, children }: DashboardWidgetProps) => {
  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" component="h2" gutterBottom>
        {title}
      </Typography>
      <Box>{children}</Box>
    </Paper>
  )
}

export default DashboardWidget
