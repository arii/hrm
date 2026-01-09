// components/StatusChip/StatusChip.tsx
import Typography from '@mui/material/Typography'
import type { Theme } from '@mui/material/styles'

interface StatusChipProps {
  label: string
  variant: 'success' | 'warning'
}

const StatusChip = ({ label, variant }: StatusChipProps) => {
  return (
    <Typography
      variant="caption"
      sx={(theme: Theme) => ({
        display: 'inline-block',
        fontWeight: 'bold',
        borderRadius: '9999px',
        px: 2,
        py: 0.5,
        color:
          variant === 'success'
            ? theme.palette.success.main
            : theme.palette.warning.main,
        backgroundColor:
          variant === 'success'
            ? theme.palette.success.main + '33'
            : theme.palette.warning.main + '33',
      })}
    >
      {label}
    </Typography>
  )
}

export default StatusChip
