import React, { ReactNode } from 'react'
import { Card, CardContent, CardProps } from '@mui/material'

interface CardWidgetProps extends CardProps {
  children: ReactNode
}

const CardWidget = ({ children, ...props }: CardWidgetProps) => {
  return (
    <Card
      elevation={3}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        ...props.sx, // Allow for custom styling
      }}
      {...props}
    >
      <CardContent sx={{ flexGrow: 1, p: 2, '&:last-child': { pb: 2 } }}>
        {children}
      </CardContent>
    </Card>
  )
}

export default CardWidget
