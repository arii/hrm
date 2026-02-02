// app/client/experimental/components/ZoneDistribution.tsx
'use client'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  styled,
  LinearProgress,
} from '@mui/material'
import { HrZoneName } from '@/lib/shared/hr-zones'
import { formatZoneDuration } from '../../../../utils/units'

interface ZoneDistributionProps {
  timeInZones: Record<HrZoneName, number>
  totalDuration: number
}

// Map zones to specific HRM palette colors for immediate recognition
const ZONE_COLORS = {
  'Warm-up': '#3498db',
  'Fat Burn': '#2ecc71',
  Cardio: '#f1c40f',
  Peak: '#e67e22',
  Max: '#e74c3c',
}

const StyledProgress = styled(LinearProgress, {
  shouldForwardProp: (prop) => prop !== 'barcolor',
})<{ barcolor: string }>(({ theme, barcolor }) => ({
  height: 10,
  borderRadius: 5,
  backgroundColor: theme.palette.grey[200],
  '& .MuiLinearProgress-bar': {
    backgroundColor: barcolor,
    borderRadius: 5,
  },
}))

interface ZoneItemProps {
  label: string
  seconds: number
  percentage: number
}

const ZoneRow: React.FC<ZoneItemProps> = ({ label, seconds, percentage }) => (
  <Box sx={{ mb: 2 }}>
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      sx={{ mb: 0.5 }}
    >
      <Typography variant="subtitle2" fontWeight="600">
        {label}
      </Typography>
      <Stack direction="row" spacing={1} alignItems="baseline">
        <Typography variant="body2" color="text.secondary">
          {formatZoneDuration(seconds)}
        </Typography>
        <Typography
          variant="caption"
          fontWeight="bold"
          sx={{ minWidth: 40, textAlign: 'right' }}
        >
          {percentage.toFixed(1)}%
        </Typography>
      </Stack>
    </Stack>
    <StyledProgress
      variant="determinate"
      value={percentage}
      barcolor={ZONE_COLORS[label as keyof typeof ZONE_COLORS] || '#999'}
      aria-label={`${label} distribution`}
    />
  </Box>
)

const ZoneDistribution = ({
  timeInZones,
  totalDuration,
}: ZoneDistributionProps) => {
  const zones = Object.entries(timeInZones)
    .map(([label, seconds]) => ({
      label,
      seconds,
      percentage: totalDuration > 0 ? (seconds / totalDuration) * 100 : 0,
    }))
    .filter(
      (zone) =>
        zone.label !== HrZoneName.NoData &&
        zone.label !== HrZoneName.Unknown &&
        zone.seconds > 0
    )

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom aria-level={2}>
          Time in Zones
        </Typography>
        <Stack spacing={1}>
          {zones.map((zone) => (
            <ZoneRow
              key={zone.label}
              label={zone.label}
              seconds={zone.seconds}
              percentage={zone.percentage}
            />
          ))}
        </Stack>
      </CardContent>
    </Card>
  )
}

export default ZoneDistribution
