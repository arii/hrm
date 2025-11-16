// File: components/HrTile.tsx
'use client'
import { Card, CardContent, Tooltip, Typography } from '@mui/material'
import { MuiThemeColor } from '@/utils/visualization'

export interface HrTileProps {
  name: string
  bpm: number
  percentMax: number
  color: MuiThemeColor
}

const HrTile = ({ name, bpm, percentMax, color }: HrTileProps) => {
  // Ensure the color passed is a valid key for the theme palette
  const themeColor = color || 'grey'

  return (
    <Tooltip
      title={`Name: ${name}, BPM: ${bpm}, % Max HR: ${percentMax}%`}
      arrow
      placement="top"
    >
      <Card
        elevation={4}
        role="region"
        aria-label={`Heart rate monitor for ${name}: ${bpm} beats per minute, ${percentMax}% of maximum`}
        sx={{
          backgroundColor: `${themeColor}.main`,
          color: (theme) => theme.palette.getContrastText(theme.palette[themeColor].main),
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <CardContent>
          {/* Giant Percentage */}
          <Typography
            variant="h1"
            component="div"
            sx={{
              fontWeight: '900',
              lineHeight: 1,
              fontSize: { xs: '5rem', sm: '6rem', md: '7rem' },
            }}
          >
            {`${percentMax}%`}
          </Typography>

          {/* BPM */}
          <Typography
            variant="h4"
            component="div"
            sx={{ fontWeight: 'bold' }}
          >
            {`${bpm} BPM`}
          </Typography>

          {/* User Name */}
          {name && (
            <Typography
              variant="h6"
              component="div"
              noWrap
              sx={{
                mt: 1,
                px: 1,
                fontWeight: 'medium',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
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
