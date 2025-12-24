// File: components/HrTile.tsx
'use client'
import { HrTileProps } from '@/types'
import Box from '@mui/material/Box'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import WifiOffIcon from '@mui/icons-material/WifiOff'
import { getHrZoneProps } from '@/utils/visualization'
import Typography from '@mui/material/Typography'
import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '@mui/material/styles'
import { Heart, TrendingUp } from 'lucide-react'
import { hexToRgba } from '@/utils/color'

// Define the style for the centered overlay
const overlayStyles = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: 'rgba(0, 0, 0, 0.7)', // Dark, semi-transparent overlay
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 10,
  borderRadius: 'inherit', // Match card border radius from StyledCard
}

const HrTile = ({
  name,
  bpm,
  percentMax,
  calories = 0, // Default to 0 to prevent NaN
  isConnected = true, // Default to connected
  isAlerting = false,
  alertMessage = 'Checking signal...',
  areAnimationsEnabled = true, // Default to enabled
}: HrTileProps) => {
  const theme = useTheme()
  const { backgroundColor, textColor } = getHrZoneProps(percentMax, 100)

  const tooltipTitle = isAlerting
    ? alertMessage
    : !isConnected
      ? 'Disconnected - Showing last known value'
      : `Name: ${name}, BPM: ${bpm}, Kcal: ${calories}, % Max HR: ${percentMax}%`

  const cardStyle = useMemo(
    () => ({
      borderRadius: '16px',
      padding: theme.spacing(2),
      boxShadow: `0 8px 32px 0 ${hexToRgba(theme.palette.common.black, 0.37)}`,
      border: `1px solid ${hexToRgba(theme.palette.common.white, 0.18)}`,
      background: `
        radial-gradient(
          circle at 50% 50%,
          ${hexToRgba(backgroundColor, 0.5)},
          ${hexToRgba(backgroundColor, 0.1)} 70%
        ),
        ${hexToRgba(theme.palette.grey[900], 0.2)}
      `,
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      color: textColor,
      textAlign: 'center' as any,
      minHeight: 180,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      position: 'relative' as any,
      opacity: isConnected ? 1 : 0.6,
    }),
    [backgroundColor, textColor, isConnected, theme]
  )

  return (
    <Tooltip title={tooltipTitle} arrow>
      <motion.div
        initial={areAnimationsEnabled ? { opacity: 0, y: 20 } : undefined}
        animate={areAnimationsEnabled ? { opacity: 1, y: 0 } : undefined}
        whileHover={areAnimationsEnabled ? { scale: 1.02, y: -5 } : {}}
        transition={areAnimationsEnabled ? { duration: 0.3 } : { duration: 0 }}
        style={cardStyle}
      >
        {/* --- Disconnected Icon --- */}
        {!isConnected && (
          <WifiOffIcon
            data-testid="WifiOffIcon"
            sx={{
              position: 'absolute',
              top: theme.spacing(1),
              right: theme.spacing(1),
              fontSize: '1.5rem',
              color: theme.palette.warning.main,
            }}
          />
        )}

        {/* --- Alerting Overlay --- */}
        {isAlerting && (
          <Box sx={overlayStyles} data-testid="hr-tile-alert-overlay">
            <CircularProgress size={30} sx={{ color: 'white' }} />
            <Typography
              variant="caption"
              sx={{ mt: 1, color: 'white', textAlign: 'center' }}
            >
              {alertMessage}
            </Typography>
          </Box>
        )}

        <Box aria-live="polite" aria-atomic="true">
          <CardContent sx={{ p: 0 }}>
            <Typography
              data-testid="live-hr-percent"
              sx={{
                fontFamily: '"Bebas Neue", "Roboto", sans-serif',
                fontSize: { xs: '6rem', sm: '7rem', md: '8rem' },
                fontWeight: 700,
                lineHeight: 1,
                my: 0,
                color: 'transparent',
                background: `linear-gradient(45deg, ${backgroundColor}, ${hexToRgba(
                  textColor,
                  0.6
                )})`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                textShadow: `0 2px 5px ${hexToRgba(
                  theme.palette.common.black,
                  0.5
                )}`,
              }}
            >
              {percentMax}
              <Typography
                component="span"
                sx={{ fontSize: '0.5em', verticalAlign: 'top' }}
              >
                %
              </Typography>
            </Typography>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                mt: 1,
              }}
            >
              {/* BPM Display */}
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <motion.div
                  animate={
                    areAnimationsEnabled && bpm > 0
                      ? {
                          scale: [1, 1.15, 1],
                          transition: {
                            duration: 60 / bpm,
                            repeat: Infinity,
                            ease: 'easeInOut',
                          },
                        }
                      : { scale: 1 }
                  }
                  style={{ display: 'inline-block', marginRight: '8px' }}
                >
                  <Heart size={20} fill={textColor} stroke="none" />
                </motion.div>
                {bpm}{' '}
                <Typography
                  variant="caption"
                  component="span"
                  sx={{ opacity: 0.8, ml: 0.5 }}
                >
                  BPM
                </Typography>
              </Typography>

              {/* Calorie Display */}
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <TrendingUp size={20} style={{ marginRight: '8px' }} />
                {Math.floor(calories)}{' '}
                <Typography
                  variant="caption"
                  component="span"
                  sx={{ opacity: 0.8, ml: 0.5 }}
                >
                  KCAL
                </Typography>
              </Typography>
            </Box>
            {name && !/^(user|new user)$/i.test(name) && (
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  top: theme.spacing(1),
                  left: theme.spacing(2),
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  backgroundColor: hexToRgba(theme.palette.common.black, 0.4),
                  padding: theme.spacing(0.5, 1.5),
                  borderRadius: '12px',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  maxWidth: 'calc(100% - 60px)', // Prevent overlap with icons
                }}
              >
                {name}
              </Typography>
            )}
          </CardContent>
        </Box>
      </motion.div>
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
