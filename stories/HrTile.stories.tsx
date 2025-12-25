// stories/HrTile.stories.tsx
import React from 'react'
import { Meta, StoryObj } from '@storybook/react'
import HrTile from '@/components/HrTile'
import { Box } from '@mui/material'

const meta: Meta<typeof HrTile> = {
  title: 'Components/HrTile',
  component: HrTile,
  decorators: [
    (Story) => (
      <Box sx={{ width: '300px', height: '200px' }}>
        <Story />
      </Box>
    ),
  ],
  argTypes: {
    name: { control: 'text' },
    bpm: { control: 'number' },
    percentMax: { control: 'range', min: 0, max: 100 },
    isConnected: { control: 'boolean' },
  },
}

export default meta

type Story = StoryObj<typeof HrTile>

export const Resting: Story = {
  args: {
    name: 'Ariel',
    bpm: 65,
    percentMax: 35,
    isConnected: true,
  },
}

export const Moderate: Story = {
  args: {
    name: 'Ariel',
    bpm: 130,
    percentMax: 70,
    isConnected: true,
  },
}

export const HighIntensity: Story = {
  args: {
    name: 'Ariel',
    bpm: 175,
    percentMax: 95,
    isConnected: true,
  },
}

export const Disconnected: Story = {
  args: {
    name: 'Ariel',
    bpm: 120,
    percentMax: 65,
    isConnected: false,
  },
}

export const LowBPM: Story = {
  args: {
    name: 'Ariel',
    bpm: 40,
    percentMax: 25,
    isConnected: true,
  },
}
