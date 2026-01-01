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

  const finalSx = {
    minHeight: '100vh',
    backgroundColor: 'background.default',
    py: { xs: 2, sm: 3 }, // default
    ...sx, // consumer sx overrides defaults
  }

  // Explicit props override everything
  if (px !== undefined) {
    finalSx.px = px
  }
  if (py !== undefined) {
    finalSx.py = py
  }

  return (
    <Container maxWidth={maxWidth} sx={finalSx} {...rest}>
      {children}
    </Container>
  )
}
