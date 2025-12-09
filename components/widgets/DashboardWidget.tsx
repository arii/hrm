// components/widgets/DashboardWidget.tsx
import React, { ReactNode } from 'react'
import { Card, CardContent, Typography, Box } from '@mui/material'
import { SxProps, Theme } from '@mui/material/styles'

interface DashboardWidgetProps {
  title: string
  children: ReactNode
  sx?: SxProps<Theme>
}

const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  title,
  children,
  sx,
}) => {
  return (
    <Card sx={{ height: '100%', ...sx }}>
      <CardContent>
        <Typography variant="h6" component="div" gutterBottom>
          {title}
        </Typography>
        <Box>{children}</Box>
      </CardContent>
    </Card>
  )
}

export default DashboardWidget
