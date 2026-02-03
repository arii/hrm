import RefreshIcon from '@mui/icons-material/Refresh'
import { IconButton, IconButtonProps } from '@mui/material'
import { alpha } from '@mui/material/styles'

interface RefreshIconButtonProps extends Omit<IconButtonProps, 'size'> {
  onClick: () => void
}

const RefreshIconButton = ({ onClick, ...props }: RefreshIconButtonProps) => {
  return (
    <IconButton
      onClick={onClick}
      size="small"
      sx={(theme) => ({
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 10,
        backgroundColor: alpha(theme.palette.background.paper, 0.7),
        backdropFilter: 'blur(4px)',
        '&:hover': {
          backgroundColor: alpha(theme.palette.background.paper, 0.9),
        },
      })}
      aria-label="refresh"
      {...props}
    >
      <RefreshIcon fontSize="small" />
    </IconButton>
  )
}

export default RefreshIconButton
