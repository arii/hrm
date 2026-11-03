// File: app/client/control/components/TimerDurationConfig.tsx
'use client'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import DurationStepper from './DurationStepper'

interface TimerDurationConfigProps {
  workTime: number
  restTime: number
  onWorkChange: (value: number) => void
  onRestChange: (value: number) => void
  disabled: boolean
}

const TimerDurationConfig = ({
  workTime,
  restTime,
  onWorkChange,
  onRestChange,
  disabled,
}: TimerDurationConfigProps) => {
  const theme = useTheme()

  return (
    <Stack spacing={3} sx={{ mb: 2 }}>
      <Box>
        <Typography
          sx={{
            color: 'common.white',
            fontWeight: 'medium',
            mb: 1,
            fontSize: '0.95rem',
            textAlign: 'center',
          }}
        >
          Timer Presets
        </Typography>
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Button
            variant="contained"
            onClick={() => {
              onWorkChange(20)
              onRestChange(10)
            }}
            disabled={disabled}
            sx={{
              flex: 1,
              backgroundColor: 'secondary.dark',
              '&:hover': { backgroundColor: 'secondary.main' },
            }}
            data-testid="timer-preset-tabata-button"
          >
            Tabata (20/10)
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              onWorkChange(60)
              onRestChange(60)
            }}
            disabled={disabled}
            sx={{
              flex: 1,
              backgroundColor: 'secondary.dark',
              '&:hover': { backgroundColor: 'secondary.main' },
            }}
            data-testid="timer-preset-emom-button"
          >
            EMOM (60/60)
          </Button>
        </Stack>
      </Box>
      <Card
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 2,
          background: alpha(theme.palette.common.white, 0.05),
          borderColor: alpha(theme.palette.common.white, 0.1),
        }}
      >
        <Stack spacing={2}>
          <DurationStepper
            label="Work Duration (s)"
            value={workTime}
            onChange={onWorkChange}
            disabled={disabled}
            color={theme.palette.error.main}
            data-testid="work-duration-input"
          />
          <DurationStepper
            label="Rest Duration (s)"
            value={restTime}
            onChange={onRestChange}
            disabled={disabled}
            color={theme.palette.success.main}
            data-testid="rest-duration-input"
          />
        </Stack>
      </Card>
    </Stack>
  )
}

export default TimerDurationConfig
