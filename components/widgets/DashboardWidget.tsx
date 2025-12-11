import { ReactNode } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  Divider,
  Box,
  Typography,
} from '@mui/material'

interface DashboardWidgetProps {
  title: string
  children: ReactNode
}

const DashboardWidget = ({ title, children }: DashboardWidgetProps) => {
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      <CardHeader
        title={
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
            {title}
          </Typography>
        }
        sx={{
          backgroundColor: 'action.hover',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      />
      <Divider />
      <CardContent sx={{ flexGrow: 1, p: 2, '&:last-child': { pb: 2 } }}>
        <Box>{children}</Box>
      </CardContent>
    </Card>
  )
}

export default DashboardWidget
