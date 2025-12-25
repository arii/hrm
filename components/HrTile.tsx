// File: components/HrTile.tsx
'use client'
import { memo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Heart, TrendingUp } from 'lucide-react'
import { Box, Typography, useTheme } from '@mui/material'
import { getHrZoneProps } from '@/utils/visualization'
import { HrTileProps } from '@/types'

const pulseAnimation = {
  scale: [1, 1.2, 1],
}

const HrTile = ({
  name,
  bpm,
  percentMax,
  isConnected = true,
}: HrTileProps) => {
  const theme = useTheme()
  const shouldReduceMotion = useReducedMotion()
  const { backgroundColor, textColor } = getHrZoneProps(percentMax, 100)

  const pulseDuration = bpm > 0 ? 60 / bpm : 0
  const animation =
    !shouldReduceMotion && isConnected && bpm > 0
      ? {
          ...pulseAnimation,
          transition: {
            duration: pulseDuration,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'easeInOut',
          },
        }
      : {}

  const ariaLabel = `${name}'s heart rate: ${isConnected ? `${bpm} beats per minute, which is ${percentMax}% of max.` : 'Disconnected.'}`

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      role="region"
      aria-label={ariaLabel}
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 180,
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        color: textColor,
        overflow: 'hidden',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        '::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at top right, ${backgroundColor} 0%, transparent 50%)`,
          opacity: 0.5,
          zIndex: -1,
          transition: 'background 0.5s ease',
        },
        opacity: isConnected ? 1 : 0.6,
        transition: theme.transitions.create(['opacity', 'background-color'], {
          duration: theme.transitions.duration.short,
        }),
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 600, textAlign: 'left', color: textColor }}>
        {name}
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flexGrow: 1,
        }}
      >
        <Typography
          sx={{
            fontFamily: 'var(--font-roboto-mono), monospace',
            fontSize: { xs: '4rem', sm: '5rem' },
            fontWeight: 700,
            lineHeight: 1,
            color: 'white', // Main BPM display remains white for max contrast
          }}
        >
          {bpm}
        </Typography>
        <Typography variant="caption" sx={{ color: textColor, opacity: 0.8 }}>
          BPM
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <motion.div
            animate={animation}
            style={{ display: 'flex' }}
          >
            <Heart size={24} color={textColor} />
          </motion.div>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUp size={24} color={textColor} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: textColor }}>
            {percentMax}%
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

const arePropsEqual = (prevProps: HrTileProps, nextProps: HrTileProps) => {
  return (
    prevProps.name === nextProps.name &&
    prevProps.bpm === nextProps.bpm &&
    prevProps.percentMax === nextProps.percentMax &&
    prevProps.isConnected === nextProps.isConnected
  )
}

export default memo(HrTile, arePropsEqual)
