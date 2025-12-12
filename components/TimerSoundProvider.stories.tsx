import type { Meta, StoryObj } from '@storybook/react'
import TimerSoundProvider from './TimerSoundProvider'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

const meta: Meta<typeof TimerSoundProvider> = {
  title: 'Components/TimerSoundProvider',
  component: TimerSoundProvider,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof TimerSoundProvider>

export const Default: Story = {
  args: {
    children: (
      <Box sx={{ p: 4 }}>
        <Typography>
          Click anywhere to initialize audio context (check console).
        </Typography>
      </Box>
    ),
  },
}
