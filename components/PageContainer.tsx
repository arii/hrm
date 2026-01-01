import { Breakpoint, Container, ContainerProps } from '@mui/material'
import { ReactNode } from 'react'

interface PageContainerProps extends ContainerProps {
  children: ReactNode
  maxWidth?: Breakpoint
}

export default function PageContainer({
  children,
  maxWidth = 'xl',
  ...props
}: PageContainerProps) {
  return (
    <Container
      maxWidth={maxWidth}
      sx={{
        py: { xs: 2, sm: 3 },
        minHeight: '100vh',
        backgroundColor: 'background.default',
      }}
      {...props}
    >
      {children}
    </Container>
  )
}
