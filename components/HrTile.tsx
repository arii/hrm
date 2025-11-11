// File: components/HrTile.tsx
'use client'
import { Card, CardContent, Typography, Tooltip } from '@mui/material'

export interface HrTileProps {
  name: string
  bpm: number
  percentMax: number // 0-100
  background: string // hex color
}

const HrTile = ({ name, bpm, percentMax, background }: HrTileProps) => {
  return (
    <Tooltip
      title={`Name: ${name}, BPM: ${bpm}, % Max HR: ${percentMax}%`}
      arrow
    >
      <Card
        elevation={6}
        role="region"
        aria-label={`Heart rate monitor for ${name}: ${bpm} beats per minute, ${percentMax}% of maximum`}
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
          border: 'none',
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: 0 }}>
          {/* Giant Percentage - should dominate the tile */}
          <Typography
            sx={{
              fontFamily: 'var(--font-roboto-mono), "Courier New", monospace',
              fontSize: { xs: '6rem', sm: '7rem', md: '8rem' },
              fontWeight: 900,
              lineHeight: 0.85,
              my: 0.5,
              textShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            {percentMax}%
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
              transition: 'font-size 0.3s ease-in-out, color 0.3s ease-in-out', // Subtle animation
            }}
          >
            {bpm} BPM
          </Typography>
          {name && !/^(user|new user)$/i.test(name) && (
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '1rem', sm: '1.1rem' },
                letterSpacing: '0.05em',
                mt: 1, // Add some margin top to separate from BPM
                textOverflow: 'ellipsis', // Truncate with ellipsis
                whiteSpace: 'nowrap', // Prevent wrapping
                overflow: 'hidden', // Hide overflow content
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
