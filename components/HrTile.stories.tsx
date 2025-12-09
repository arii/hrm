import type { Meta, StoryObj } from '@storybook/react'
import HrTile from './HrTile'
import theme from '../lib/theme'

const meta = {
  title: 'Components/HrTile',
  component: HrTile,
  // This enables auto-generated controls for your props
  tags: ['autodocs'],
  argTypes: {
    background: { control: 'color' },
    percentMax: { control: { type: 'range', min: 0, max: 100 } },
    bpm: { control: { type: 'number', min: 0, max: 220 } },
  },
} satisfies Meta<typeof HrTile>

export default meta
type Story = StoryObj<typeof meta>

// 1. Baseline State
export const Resting: Story = {
  args: {
    name: 'User 1',
    bpm: 65,
    percentMax: 35,
    background: theme.palette.success.main, // green
  },
}

// 2. Critical State (Visual Stress Test)
export const HighIntensity: Story = {
  args: {
    name: 'Athlete A',
    bpm: 185,
    percentMax: 95,
    background: theme.palette.primary.main, // red
  },
}

// 3. Edge Case: Long Names
export const LongNameTruncation: Story = {
  args: {
    name: 'Christopher "The Machine" Richardson',
    bpm: 120,
    percentMax: 60,
    background: theme.palette.secondary.main, // blue
  },
}
