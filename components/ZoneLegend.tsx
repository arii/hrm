'use client'
import React from 'react'
import { Box, Typography, Stack, useTheme } from '@mui/material'
import { HrZoneName, HR_ZONE_DEFINITIONS } from '@/lib/shared/hr-zones'
import { HR_ZONE_UI_PROPS_MAP } from '@/utils/visualization'

const ZoneLegend = () => {
  const theme = useTheme()

  // Create a full list of zones including Resting
  // HR_ZONE_DEFINITIONS are ordered WarmUp -> Max
  // We want Resting first.
  const zones = [
    { name: HrZoneName.Resting, label: 'Resting (<50%)' },
    ...HR_ZONE_DEFINITIONS.map((z) => ({
        name: z.name,
        label: `${z.name} (${z.min * 100}%)`
    })),
  ]

  return (
    <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
      <Typography variant="subtitle2" gutterBottom align="center" color="text.secondary">
        Heart Rate Zones
      </Typography>
      <Stack
        direction="row"
        flexWrap="wrap"
        justifyContent="center"
        gap={1}
      >
        {zones.map((zone) => {
          const props = HR_ZONE_UI_PROPS_MAP[zone.name]
          // Force white text for better contrast on colored backgrounds
          // similar to logic in getHrZoneProps
          const textColor = '#FFFFFF'

          return (
            <Box
              key={zone.name}
              sx={{
                display: 'flex',
                alignItems: 'center',
                bgcolor: props.bgColor,
                color: textColor,
                px: 1.5,
                py: 0.5,
                borderRadius: 4,
                fontSize: '0.75rem',
                fontWeight: 600,
                boxShadow: 1
              }}
            >
              {zone.label}
            </Box>
          )
        })}
      </Stack>
    </Box>
  )
}

export default ZoneLegend
