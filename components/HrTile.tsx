// File: components/HrTile.tsx
'use client'
import { useTheme } from '@mui/material/styles'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { memo } from 'react'

export interface HrTileProps {
  name: string
  bpm: number
  percentMax: number // 0-100
  background: string // hex color
}

const HrTile = ({ name, bpm, percentMax, background }: HrTileProps) => {
  const theme = useTheme()
  const textColor = theme.palette.getContrastText(background)

  return (
    <Tooltip
      title={`Name: ${name}, BPM: ${bpm}, % Max HR: ${percentMax}%`}
      arrow
    >
      <Card
        data-testid="hr-tile-card"
        elevation={6}
        role="region"
        aria-label={`Heart rate monitor for ${name}: ${bpm} beats per minute, ${percentMax}% of maximum`}
        sx={{
          backgroundColor: background,
          color: textColor,
          textAlign: 'center',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          borderRadius: 4, // Increased for modern look
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
          {/* Main Percentage Display */}
          <Typography
            sx={{
              fontFamily: 'var(--font-roboto-mono), "Courier New", monospace',
              fontSize: { xs: '4rem', sm: '4.5rem' }, // Scaled down for balance
              fontWeight: 700, // Adjusted for readability
              lineHeight: 1,
              textShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}
          >
            {`${percentMax}%`}
          </Typography>

          {/* BPM */}
          <Typography
            variant="h5" // Increased prominence
            sx={{
              fontWeight: 600,
              opacity: 0.9,
            }}
          >
            {`${bpm} bpm`}
          </Typography>

          {/* User Name */}
          {name && !/^(user|new user)$/i.test(name) && (
            <Typography
              variant="h6" // Increased font size for better visibility
              sx={{
                fontWeight: 700, // Make name bold
                letterSpacing: '0.05em',
                mt: 1,
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                px: 1,
                opacity: 0.9,
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

export default memo(HrTile)
