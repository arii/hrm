// File: components/HrTile.tsx
'use client'
import { HrTileProps } from '@/types'
import Box from '@mui/material/Box'
import CardContent from '@mui/material/CardContent'
import Tooltip from '@mui/material/Tooltip'
import { getHrZoneProps } from '@/utils/visualization'
import Typography from '@mui/material/Typography'
import { memo } from 'react'
import StyledCard from './shared/StyledCard'
import ReportIcon from '@mui/icons-material/Report'

const HrTile = ({
  name,
  bpm,
  percentMax,
  isAlerting,
  alertMessage = 'Checking signal...',
}: HrTileProps) => {
  const { backgroundColor } = getHrZoneProps(percentMax, 100)

  return (
    <Tooltip
      title={
        isAlerting
          ? alertMessage
          : `Name: ${name}, BPM: ${bpm}, % Max HR: ${percentMax}%`
      }
      arrow
    >
      <StyledCard
        data-testid="hr-tile-card"
        role="region"
        aria-label={`Heart rate monitor for ${name}: ${bpm} beats per minute, ${percentMax}% of maximum`}
        sx={{
          backgroundColor: backgroundColor,
          color: '#fff',
          textAlign: 'center',
          minHeight: 180,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden', // Ensure the banner is contained
        }}
      >
        {isAlerting && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              p: 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
            data-testid="hr-tile-alert-banner"
          >
            <ReportIcon sx={{ fontSize: '1rem', mr: 0.5 }} />
            <Typography variant="caption">{alertMessage}</Typography>
          </Box>
        )}
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
                textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                animation: 'subtle-pulse 2s infinite ease-in-out',
                animationPlayState:
                  bpm > 0 && !isAlerting ? 'running' : 'paused',
              }}
            >
              {percentMax}%
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
    prevProps.percentMax === nextProps.percentMax &&
    prevProps.isAlerting === nextProps.isAlerting &&
    prevProps.alertMessage === nextProps.alertMessage
  )
}

export default memo(HrTile, arePropsEqual)
