// components/PageContainer.tsx
'use client'
import React from 'react'
import Container, { ContainerProps } from '@mui/material/Container'
import { useTheme } from '@mui/material/styles'
import BottomNavBar from './BottomNavBar'

/**
 * Props for the PageContainer component.
 * @description Extends MUI's ContainerProps to allow all standard container props to be passed through.
 * This allows passing standard HTML attributes (e.g. id) and event handlers (e.g. onClick) to the underlying container element.
 * See {@link https://mui.com/material-ui/api/container/} for a full list of available props.
 * It also adds a custom `hasNavBar` prop for consistent layout management.
 */
interface PageContainerProps extends ContainerProps {
  /**
   * If true, the bottom navigation bar will be displayed, and appropriate padding will be added.
   * @default true
   */
  hasNavBar?: boolean
  /**
   * Determine the max-width of the container. The container width grows with the size of the screen.
   * Set to false to disable maxWidth.
   * @default 'xl'
   */
  maxWidth?: ContainerProps['maxWidth']
  /**
   * The system prop that allows defining system overrides as well as custom CSS styles.
   */
  sx?: ContainerProps['sx']
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
