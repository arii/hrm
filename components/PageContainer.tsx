import {
  Breakpoint,
  Container,
  ContainerProps,
  SxProps,
  Theme,
} from '@mui/material'
import { ReactNode } from 'react'

/**
 * Props for the PageContainer component.
 * Explicit `px` and `py` props are provided to override the default padding
 * and have higher precedence than any padding values defined in the `sx` prop.
 */
interface PageContainerProps extends ContainerProps {
  children: ReactNode
  maxWidth?: Breakpoint
  px?: number | string | object
  py?: number | string | object
}

/**
 * A layout component that wraps MUI's Container to provide a consistent
 * page-level wrapper with sensible defaults for padding, background color,
 * and minimum height.
 *
 * @param {PageContainerProps} props - The props for the component.
 * @returns {JSX.Element} The rendered PageContainer component.
 */
export default function PageContainer({
  children,
  maxWidth = 'xl',
  px,
  py,
  ...props
}: PageContainerProps) {
  const { sx, ...rest } = props

  const finalSx: SxProps<Theme> = {
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
