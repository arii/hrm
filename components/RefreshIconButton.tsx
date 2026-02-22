import RefreshIcon from '@mui/icons-material/Refresh'
import { IconButton, IconButtonProps } from '@mui/material'
import { alpha } from '@mui/material/styles'

interface RefreshIconButtonProps extends IconButtonProps {
  onClick: () => void
}

const RefreshIconButton = ({ onClick, ...props }: RefreshIconButtonProps) => (
  <IconButton
    onClick={onClick}
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
      width: 48,
      height: 48,
    })}
    {...props}
  >
    <RefreshIcon fontSize="small" />
  </IconButton>
)

export default RefreshIconButton
