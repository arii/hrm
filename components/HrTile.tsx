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
import { memo } from 'react'
import { motion, MotionStyle } from 'framer-motion'
import { useTheme } from '@mui/material/styles'
import { Heart, TrendingUp } from 'lucide-react'

// Helper to convert hex to RGBA
const hexToRgba = (hex: string, alpha: number) => {
  if (!/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    return `rgba(0, 0, 0, ${alpha})` // Return a default color for invalid hex
  }
  let c = hex.substring(1).split('')
  if (c.length === 3) {
    const [c0, c1, c2] = c
    if (c0 && c1 && c2) {
      c = [c0, c0, c1, c1, c2, c2]
    }
  }
  const i = parseInt(c.join(''), 16)
  const r = (i >> 16) & 255
  const g = (i >> 8) & 255
  const b = i & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Define the style for the centered overlay
const overlayStyles = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: 'rgba(0, 0, 0, 0.7)', // Dark, semi-transparent overlay
  display: 'flex',
  flexDirection: 'column' as const,
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 10,
  borderRadius: 'inherit', // Match card border radius from StyledCard
}

const HrTile = ({
  name,
  bpm,
  percentMax,
  isConnected = true,
  isAlerting = false,
  alertMessage = 'Checking signal...',
  areAnimationsEnabled = true,
}: HrTileProps) => {
  const theme = useTheme()
  const { backgroundColor, textColor, zone } = getHrZoneProps(
    percentMax,
    100
  )

  const tooltipTitle = isAlerting
    ? alertMessage
    : !isConnected
      ? 'Disconnected - Showing last known value'
      : `Name: ${name} | Zone: ${zone}`

  const animationDuration = 60 / bpm
  const isBpmValid = bpm > 0 && !isAlerting && isConnected

  // Conditional hover effect
  const whileHover = areAnimationsEnabled ? { scale: 1.02, y: -5 } : {}

  const cardStyle: MotionStyle = {
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
    textAlign: 'center' as const,
    minHeight: 180,
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    position: 'relative' as const,
    opacity: isConnected ? 1 : 0.6,
    overflow: 'hidden',
  }

  return (
    <Tooltip title={tooltipTitle} arrow>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={whileHover}
        transition={{ duration: 0.3 }}
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

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'absolute',
            top: theme.spacing(1.5),
            left: theme.spacing(2),
          }}
        >
          <motion.div
            animate={{
              scale: isBpmValid ? [1, 1.2, 1] : 1,
            }}
            transition={{
              duration: animationDuration,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <Heart
              size={24}
              color={textColor}
              fill={isBpmValid ? textColor : 'none'}
            />
          </motion.div>
          <Typography
            variant="h6"
            sx={{
              ml: 1,
              fontWeight: 600,
              fontFamily: 'var(--font-roboto-mono)',
            }}
          >
            {bpm}
          </Typography>
        </Box>

        <Box
          sx={{
            position: 'absolute',
            top: theme.spacing(1.5),
            right: theme.spacing(2),
          }}
        >
          <TrendingUp size={24} color={textColor} />
        </Box>

        <CardContent sx={{ p: 0, position: 'relative', zIndex: 1 }}>
          <Typography
            data-testid="live-hr-percent"
            sx={{
              fontFamily: 'var(--font-roboto-mono), "Courier New", monospace',
              fontSize: { xs: '5rem', sm: '6rem', md: '7rem' },
              fontWeight: 900,
              lineHeight: 0.85,
              my: 0.5,
              background: `linear-gradient(45deg, ${backgroundColor}, ${textColor})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: `0px 2px 10px ${hexToRgba(backgroundColor, 0.5)}`,
            }}
          >
            {percentMax}
            <Typography
              component="span"
              sx={{
                fontSize: '0.3em',
                verticalAlign: 'super',
                marginLeft: '0.1em',
              }}
            >
              %
            </Typography>
          </Typography>
        </CardContent>

        {name && !/^(user|new user)$/i.test(name) && (
          <Box
            sx={{
              position: 'absolute',
              bottom: theme.spacing(1),
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: hexToRgba(textColor, 0.1),
              borderRadius: '12px',
              px: 1.5,
              py: 0.5,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: textColor,
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              {name}
            </Typography>
          </Box>
        )}
      </motion.div>
    </Tooltip>
  )
}

const arePropsEqual = (prevProps: HrTileProps, nextProps: HrTileProps) => {
  return (
    prevProps.name === nextProps.name &&
    prevProps.bpm === nextProps.bpm &&
    prevProps.percentMax === nextProps.percentMax &&
    prevProps.isConnected === nextProps.isConnected &&
    prevProps.isAlerting === nextProps.isAlerting &&
    prevProps.alertMessage === nextProps.alertMessage &&
    prevProps.areAnimationsEnabled === nextProps.areAnimationsEnabled
  )
}

export default memo(HrTile, arePropsEqual)
