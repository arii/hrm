// components/Card/DashboardCard.tsx
import { Card, CardContent, CardProps } from '@mui/material'
import { ReactNode } from 'react'

export interface DashboardCardProps extends CardProps {
  children: ReactNode
}

const DashboardCard = ({ children, ...rest }: DashboardCardProps) => {
  return (
    <Card elevation={6} {...rest}>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export default DashboardCard
