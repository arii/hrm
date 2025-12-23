// File: components/HrTile.tsx
'use client'
import { HrTileProps } from '@/types'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import WifiOffIcon from '@mui/icons-material/WifiOff'
import { getHrZoneProps } from '@/utils/visualization'
import Typography from '@mui/material/Typography'
import { memo } from 'react'
import { useTheme } from '@mui/material/styles'

const HrTile = ({
  name,
  bpm,
  percentMax,
  calories = 0,
  isConnected = true,
  isAlerting = false,
  alertMessage = 'Checking signal...',
}: HrTileProps) => {
  const theme = useTheme()
  const { backgroundColor, textColor } = getHrZoneProps(percentMax, 100)

  const tooltipTitle = isAlerting
    ? alertMessage
    : !isConnected
    ? 'Disconnected - Showing last known value'
    : `Name: ${name}, BPM: ${bpm}, Kcal: ${Math.floor(
        calories
      )}, % Max HR: ${percentMax}%`

  return (
    <Tooltip title={tooltipTitle} arrow>
      <Card
        elevation={2}
        data-testid="hr-tile-card"
        role="region"
        aria-label={`Heart rate monitor for ${name}: ${
          isConnected ? `${bpm} beats per minute` : 'Disconnected'
        }, ${percentMax}% of maximum`}
        sx={{
          backgroundColor,
          color: textColor,
          textAlign: 'center',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          opacity: isConnected ? 1 : 0.6,
          transition: theme.transitions.create(['background-color', 'opacity']),
          overflow: 'hidden',
        }}
      >
        {!isConnected && (
          <WifiOffIcon
            sx={{
              position: 'absolute',
              top: theme.spacing(1),
              right: theme.spacing(1),
              fontSize: '1.5rem',
              color: 'rgba(0, 0, 0, 0.25)',
            }}
          />
        )}

        {isAlerting && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10,
              color: '#fff',
            }}
            data-testid="hr-tile-alert-overlay"
          >
            <CircularProgress size={30} color="inherit" />
            <Typography variant="caption" sx={{ mt: 1 }}>
              {alertMessage}
            </Typography>
          </Box>
        )}

        <CardContent
          sx={{
            p: 2,
            '&:last-child': {
              pb: 2,
            },
          }}
        >
          <Box aria-live="polite" aria-atomic="true">
            <Typography
              data-testid="live-hr-percent"
              sx={{
                fontFamily: 'var(--font-roboto-mono), monospace',
                fontSize: { xs: '3.5rem', sm: '4rem' },
                fontWeight: 700,
                lineHeight: 1,
                textShadow: '0 1px 3px rgba(0,0,0,0.2)',
                animation: 'subtle-pulse 2s infinite ease-in-out',
                animationPlayState:
                  bpm > 0 && !isAlerting && isConnected ? 'running' : 'paused',
              }}
            >
              {percentMax}
              <Typography
                variant="h5"
                component="span"
                sx={{
                  fontWeight: 'inherit',
                  fontFamily: 'inherit',
                  opacity: 0.8,
                }}
              >
                %
              </Typography>
            </Typography>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 4,
                mt: 1,
              }}
            >
              <Typography variant="h6" component="div">
                {bpm}
                <Typography
                  variant="caption"
                  component="span"
                  sx={{ ml: 0.5, opacity: 0.8 }}
                >
                  BPM
                </Typography>
              </Typography>
              <Typography variant="h6" component="div">
                {Math.floor(calories)}
                <Typography
                  variant="caption"
                  component="span"
                  sx={{ ml: 0.5, opacity: 0.8 }}
                >
                  KCAL
                </Typography>
              </Typography>
            </Box>
            {name && !/^(user|new user)$/i.test(name) && (
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 500,
                  mt: 1,
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                {name}
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>
    </Tooltip>
  )
}

// Custom comparison function for React.memo
const arePropsEqual = (prevProps: HrTileProps, nextProps: HrTileProps) => {
  return (
    prevProps.name === nextProps.name &&
    prevProps.bpm === nextProps.bpm &&
    prevProps.percentMax === nextProps.percentMax &&
    prevProps.calories === nextProps.calories &&
    prevProps.isConnected === nextProps.isConnected &&
    prevProps.isAlerting === nextProps.isAlerting &&
    prevProps.alertMessage === nextProps.alertMessage
  )
}

export default memo(HrTile, arePropsEqual)
