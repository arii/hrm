// File: components/DashboardSectionLoadingSkeleton.tsx
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'

interface DashboardSectionLoadingSkeletonProps {
  height: number | string
}

const DashboardSectionLoadingSkeleton = ({
  height,
}: DashboardSectionLoadingSkeletonProps) => {
  return (
    <Box sx={{ width: '100%' }}>
      <Skeleton
        variant="rectangular"
        height={height}
        sx={{ borderRadius: 3 }}
      />
    </Box>
  )
}

export default DashboardSectionLoadingSkeleton
