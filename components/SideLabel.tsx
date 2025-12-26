
import Typography from '@mui/material/Typography'
import { FC } from 'react'

interface SideLabelProps {
  text: string
  ariaLabel: string
  rotation: 'left' | 'right'
}

const SideLabel: FC<SideLabelProps> = ({ text, ariaLabel, rotation }) => {
  return (
    <Typography
      variant="body2"
      aria-label={ariaLabel}
      sx={{
        color: '#fff',
        fontWeight: 700,
        letterSpacing: rotation === 'left' ? 2 : 1,
        whiteSpace: 'nowrap',
        fontSize: rotation === 'left' ? '0.9rem' : '0.8rem',
        backgroundColor: 'rgba(255,255,255,0.1)',
        px: 1,
        py: 0.5,
        borderRadius: 1,
        transform: rotation === 'left' ? 'rotate(-90deg)' : 'rotate(90deg)',
      }}
    >
      {text}
    </Typography>
  )
}

export default SideLabel
