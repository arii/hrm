'use client'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  LinearProgress,
} from '@mui/material'
import { HrZoneName } from '@/lib/shared/hr-zones'
import { formatZoneDuration } from '../../../../utils/units'
import { useTheme } from '@mui/material/styles'

interface ZoneDistributionProps {
  timeInZones: Record<HrZoneName, number>
  totalDuration: number
}

interface ZoneItemProps {
  label: string
  seconds: number
  percentage: number
  color: string
}

const ZoneRow: React.FC<ZoneItemProps> = ({
  label,
  seconds,
  percentage,
  color,
}) => (
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
    <LinearProgress
      variant="determinate"
      value={percentage}
      aria-label={`${label} distribution`}
      sx={{
        height: 10,
        borderRadius: 5,
        backgroundColor: (theme) => theme.palette.grey[200],
        '& .MuiLinearProgress-bar': {
          backgroundColor: color,
          borderRadius: 5,
        },
      }}
    />
  </Box>
)

const ZoneDistribution = ({
  timeInZones,
  totalDuration,
}: ZoneDistributionProps) => {
  const theme = useTheme()
  const ZONE_COLORS: Record<HrZoneName, string> = {
    [HrZoneName.Resting]: theme.palette.custom.resting,
    [HrZoneName.WarmUp]: theme.palette.custom.warmUp,
    [HrZoneName.FatBurn]: theme.palette.custom.fatBurn,
    [HrZoneName.Cardio]: theme.palette.custom.cardio,
    [HrZoneName.Peak]: theme.palette.custom.peak,
    [HrZoneName.Max]: theme.palette.custom.max,
    [HrZoneName.NoData]: theme.palette.grey[400],
    [HrZoneName.Unknown]: theme.palette.grey[400],
  }

  const zones = Object.entries(timeInZones)
    .map(([label, seconds]) => ({
      label,
      seconds,
      percentage: totalDuration > 0 ? (seconds / totalDuration) * 100 : 0,
      color: ZONE_COLORS[label as HrZoneName],
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
              color={zone.color}
            />
          ))}
        </Stack>
      </CardContent>
    </Card>
  )
}

export default ZoneDistribution
