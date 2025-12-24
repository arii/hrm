import type { Meta, StoryObj } from '@storybook/react'
import Box from '@mui/material/Box'
import HrTile from './HrTile'

const meta = {
  title: 'Components/HrTile',
  component: HrTile,
  tags: ['autodocs'],
  argTypes: {
    percentMax: { control: { type: 'range', min: 0, max: 100 } },
    bpm: { control: { type: 'number', min: 0, max: 220 } },
    calories: { control: { type: 'number', min: 0, max: 1000 } },
    isConnected: { control: 'boolean' },
    isAlerting: { control: 'boolean' },
    alertMessage: { control: 'text' },
  },
  decorators: [
    Story => (
      <Box
        sx={{
          background:
            'linear-gradient(135deg, hsl(230, 40%, 15%), hsl(260, 40%, 25%))',
          padding: '2rem',
          width: '300px',
          height: '250px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof HrTile>

export default meta
type Story = StoryObj<typeof meta>

export const Resting: Story = {
  args: {
    name: 'User 1',
    bpm: 65,
    percentMax: 35,
    calories: 120,
    isConnected: true,
    isAlerting: false,
  },
}

export const HighIntensity: Story = {
  args: {
    name: 'Athlete A',
    bpm: 185,
    percentMax: 95,
    calories: 450,
    isConnected: true,
    isAlerting: false,
  },
}

export const Disconnected: Story = {
  args: {
    ...Resting.args,
    name: 'User 2',
    isConnected: false,
  },
}

export const Alerting: Story = {
  args: {
    ...HighIntensity.args,
    name: 'Athlete B',
    isAlerting: true,
    alertMessage: 'Signal Lost...',
  },
}

export const LongNameTruncation: Story = {
  args: {
    name: 'Christopher "The Machine" Richardson',
    bpm: 120,
    percentMax: 60,
    calories: 300,
    isConnected: true,
    isAlerting: false,
  },
}
