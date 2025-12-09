import type { Meta, StoryObj } from '@storybook/react'
import HrTile from './HrTile'

const meta = {
  title: 'Components/HrTile',
  component: HrTile,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    background: { control: 'color' },
    percentMax: { control: { type: 'range', min: 0, max: 100 } },
    bpm: { control: { type: 'number', min: 40, max: 220 } },
  },
} satisfies Meta<typeof HrTile>

export default meta
type Story = StoryObj<typeof meta>

// Scenario 1: Resting Heart Rate
export const Resting: Story = {
  args: {
    name: 'Resting User',
    bpm: 65,
    percentMax: 35,
    background: '#2196F3', // Zone 2 (Blue)
  },
}

// Scenario 2: Peak Performance
export const PeakZone: Story = {
  args: {
    name: 'Athlete Pro',
    bpm: 185,
    percentMax: 95,
    background: '#F44336', // Zone 5 (Red)
  },
}

// Scenario 3: Long Name Handling
export const LongNameTruncation: Story = {
  args: {
    name: 'Christopher Livingstone-Smythe',
    bpm: 140,
    percentMax: 75,
    background: '#4CAF50', // Zone 3 (Green)
  },
}
