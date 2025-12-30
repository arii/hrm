import React from 'react'
import Skeleton from '@mui/material/Skeleton'
import Box from '@mui/material/Box'

export interface DashboardSectionLoadingSkeletonProps {
  width?: string | number
  height?: string | number
  shape?: 'text' | 'rectangular' | 'rounded' | 'circular'
  count?: number
  className?: string
}

const DashboardSectionLoadingSkeleton: React.FC<
  DashboardSectionLoadingSkeletonProps
> = ({
  width = '100%',
  height = '100px',
  shape = 'rectangular',
  count = 1,
  className,
}) => {
  const skeletons = Array.from({ length: count }, (_, index) => (
    <Skeleton
      key={index}
      variant={shape}
      width={width}
      height={height}
      animation="wave"
      {...(className && { className })}
    />
  ))

  return <Box>{skeletons}</Box>
}

export default DashboardSectionLoadingSkeleton
