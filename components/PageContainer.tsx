// components/PageContainer.tsx
import React from 'react'
import Container, { ContainerProps } from '@mui/material/Container'
import { useTheme } from '@mui/material/styles'
import BottomNavBar from './BottomNavBar'

/**
 * Props for the PageContainer component.
 * Extends MUI ContainerProps and adds a `hasNavBar` prop for consistent layout.
 */
interface PageContainerProps extends ContainerProps {
  /**
   * If true, the bottom navigation bar will be displayed, and appropriate padding will be added.
   * @default true
   */
  hasNavBar?: boolean
}

const PageContainer: React.FC<PageContainerProps> = ({
  children,
  hasNavBar = true,
  maxWidth = 'xl',
  sx,
  ...props
}) => {
  const theme = useTheme()

  return (
    <>
      <Container
        maxWidth={maxWidth}
        sx={{
          py: { xs: 2, sm: 3 },
          ...(hasNavBar && { pb: theme.spacing(10) }),
          minHeight: '100vh',
          backgroundColor: 'background.default',
          ...sx,
        }}
        {...props}
      >
        {children}
      </Container>
      {hasNavBar && <BottomNavBar />}
    </>
  )
}

export default PageContainer
