// File: components/HrTile.tsx
'use client'
import { Box, Card, CardContent, Tooltip, Typography, keyframes } from '@mui/material'

// Pulse animation for active HR monitoring
const pulse = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.9; }
  100% { transform: scale(1); opacity: 1; }
`

export interface HrTileProps {
  name: string
  bpm: number
  percentMax: number
  background: string
}

const HrTile = ({ name, bpm, percentMax, background }: HrTileProps) => {
  return (
    <Tooltip
      title={`${name}: ${bpm} BPM (${percentMax}%)`}
      arrow
      enterTouchDelay={0} // Better mobile UX
    >
      <Card
        elevation={6}
        role="article"
        aria-label={`Heart rate for ${name}`}
        sx={{
          backgroundColor: background,
          color: '#fff',
          p: 2,
          textAlign: 'center',
          minHeight: 180,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          borderRadius: 3,
          transition: 'transform 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)', // Subtle lift on hover
          }
        }}
      >
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Typography
            sx={{
              fontFamily: 'var(--font-roboto-mono), monospace',
              fontSize: 'clamp(5rem, 10vw, 8rem)', // Fluid sizing
              fontWeight: 900,
              lineHeight: 0.85,
              my: 1,
              textShadow: '0 4px 8px rgba(0,0,0,0.2)',
              animation: `${pulse} 2s infinite ease-in-out`, // Heartbeat effect
            }}
          >
            {percentMax}%
          </Typography>

          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontSize: '1.5rem',
              textShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            {bpm} <Box component="span" sx={{ fontSize: '0.8em', opacity: 0.9 }}>BPM</Box>
          </Typography>

          {name && !/^(user|new user)$/i.test(name) && (
            <Typography
              variant="subtitle1"
              component="div"
              sx={{
                fontWeight: 700,
                fontSize: '1.1rem',
                mt: 1.5,
                px: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                backgroundColor: 'rgba(0,0,0,0.15)', // Legibility backing
                borderRadius: 4,
                py: 0.5,
              }}
            >
              {name}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Tooltip>
  )
}

export default HrTile