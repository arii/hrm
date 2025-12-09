// File: components/HrTile.tsx
'use client'
import Box from '@mui/material/Box'
import CardContent from '@mui/material/CardContent'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { memo } from 'react'
import StyledCard from './shared/StyledCard'

export interface HrZoneProps {
  zone: string
  percentage: number
  color: string
  progressColor: string
  backgroundColor: string
  bpm: number
}

export interface HrTileProps {
  name: string
  bpm: number
  hrZoneProps: HrZoneProps
}

const HrTile = ({ name, bpm, hrZoneProps }: HrTileProps) => {
  const { percentage, progressColor } = hrZoneProps

  return (
    <Tooltip
      title={`Name: ${name}, BPM: ${bpm}, % Max HR: ${percentage}%`}
      arrow
    >
      <StyledCard
        data-testid="hr-tile-card"
        role="region"
        aria-label={`Heart rate monitor for ${name}: ${bpm} beats per minute, ${percentage}% of maximum`}
        sx={{
          backgroundColor: progressColor,
          color: '#fff',
          textAlign: 'center',
          minHeight: 180,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          boxShadow: `0 10px 20px -5px ${progressColor}50, 0 4px 5px -2px ${progressColor}30`,
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: `0 14px 28px -7px ${progressColor}70, 0 6px 8px -3px ${progressColor}50`,
          },
        }}
      >
        <Box aria-live="polite" aria-atomic="true">
          <CardContent sx={{ p: 0 }}>
            <Typography
              data-testid="live-hr-percent"
              sx={{
                fontFamily: 'var(--font-roboto-mono), "Courier New", monospace',
                fontSize: { xs: '5rem', sm: '6rem', md: '7rem' },
                fontWeight: 900,
                lineHeight: 0.85,
                my: 0.5,
                background: `linear-gradient(45deg, ${hrZoneProps.progressColor} 30%, #ffffff 120%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: `drop-shadow(0 0 10px ${hrZoneProps.progressColor}90)`,
              }}
            >
              {percentage}%
            </Typography>
            <Typography
              data-testid="live-hr-value"
              variant="h6"
              sx={{
                fontWeight: 600,
                fontSize: { xs: '1.2rem', sm: '1.4rem', md: '1.6rem' },
                transition:
                  'font-size 0.3s ease-in-out, color 0.3s ease-in-out',
              }}
            >
              {bpm} BPM
            </Typography>
            {name && !/^(user|new user)$/i.test(name) && (
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                  letterSpacing: '0.05em',
                  mt: 1,
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                {name}
              </Typography>
            )}
          </CardContent>
        </Box>
      </StyledCard>
    </Tooltip>
  )
}

const arePropsEqual = (prevProps: HrTileProps, nextProps: HrTileProps) => {
  return (
    prevProps.name === nextProps.name &&
    prevProps.bpm === nextProps.bpm &&
    prevProps.hrZoneProps.progressColor ===
      nextProps.hrZoneProps.progressColor &&
    prevProps.hrZoneProps.percentage === nextProps.hrZoneProps.percentage
  )
}

export default memo(HrTile, arePropsEqual)
