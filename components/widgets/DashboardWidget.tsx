// File: components/widgets/DashboardWidget.tsx
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import { ReactNode } from 'react'

export interface DashboardWidgetProps {
  title: string
  children: ReactNode
}

const DashboardWidget = ({ title, children }: DashboardWidgetProps) => {
  return (
    <Card
      elevation={3}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
      }}
    >
      <CardHeader
        title={title}
        titleTypographyProps={{
          variant: 'h6',
          component: 'div',
          sx: { fontWeight: 'bold' },
        }}
        sx={{ pb: 1 }}
      />
      <Divider />
      <CardContent
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        {children}
      </CardContent>
    </Card>
  )
}

export default DashboardWidget
