import { Breakpoint, Container, ContainerProps } from '@mui/material'
import { ReactNode } from 'react'

interface PageContainerProps extends ContainerProps {
  children: ReactNode
  maxWidth?: Breakpoint
  px?: number | string | object
  py?: number | string | object
}

export default function PageContainer({
  children,
  maxWidth = 'xl',
  px,
  py,
  ...props
}: PageContainerProps) {
  const { sx, ...rest } = props

  return (
    <Container
      maxWidth={maxWidth}
      sx={{
        py: py ?? { xs: 2, sm: 3 },
        px: px,
        minHeight: '100vh',
        backgroundColor: 'background.default',
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Container>
  )
}
