// File: components/DashboardSectionLoadingSkeleton.tsx
import Skeleton from '@mui/material/Skeleton'

interface DashboardSectionLoadingSkeletonProps {
  height: number | string
  borderRadius?: number | string
}

const DashboardSectionLoadingSkeleton = ({
  height,
  borderRadius = 3,
}: DashboardSectionLoadingSkeletonProps) => {
  return (
    <Skeleton
      variant="rectangular"
      height={height}
      sx={{ width: '100%', borderRadius: borderRadius }}
    />
  )
}

export default DashboardSectionLoadingSkeleton
