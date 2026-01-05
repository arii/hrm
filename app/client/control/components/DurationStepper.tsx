// File: app/client/control/components/DurationStepper.tsx
'use client'
import Add from '@mui/icons-material/Add'
import Remove from '@mui/icons-material/Remove'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

interface DurationStepperProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  color?: string
}

const stepperButtonSx = {
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  color: 'white',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
  },
  width: 48,
  height: 48,
}

const DurationStepper: React.FC<DurationStepperProps> = ({
  label,
  value,
  onChange,
  min = 0,
  step = 5,
  disabled = false,
  color = '#FFFFFF',
}) => {
  const handleIncrement = () => {
    onChange(value + step)
  }

  const handleDecrement = () => {
    onChange(Math.max(min, value - step))
  }

  return (
    <Box>
      <Typography
        sx={{
          color: 'white',
          fontWeight: 'medium',
          mb: 0.5,
          fontSize: '0.9rem',
          textAlign: 'center',
        }}
      >
        {label}
      </Typography>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="center"
        spacing={1}
      >
        <Tooltip title={`Decrease by ${step}s`} arrow>
          <span>
            <IconButton
              onClick={handleDecrement}
              aria-label={`Decrease ${label}`}
              disabled={disabled || value <= min}
              sx={stepperButtonSx}
            >
              <Remove fontSize="large" />
            </IconButton>
          </span>
        </Tooltip>
        <Typography
          sx={{
            color,
            fontWeight: 'bold',
            fontSize: '2.5rem',
            textAlign: 'center',
            minWidth: '80px',
            fontFamily: 'monospace',
          }}
          data-testid={`${label.toLowerCase()}-duration-display`}
        >
          {value}
        </Typography>
        <Tooltip title={`Increase by ${step}s`} arrow>
          <span>
            <IconButton
              onClick={handleIncrement}
              aria-label={`Increase ${label}`}
              disabled={disabled}
              sx={stepperButtonSx}
            >
              <Add fontSize="large" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Box>
  )
}

export default DurationStepper
