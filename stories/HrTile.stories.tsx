import type { Meta, StoryObj } from '@storybook/react'
import HrTile from '../components/HrTile'

const meta: Meta<typeof HrTile> = {
  title: 'Components/HrTile',
  component: HrTile,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    background: { control: 'color' },
    bpm: { control: { type: 'range', min: 60, max: 200, step: 1 } },
    percentMax: { control: { type: 'range', min: 0, max: 100, step: 1 } },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const RestZone: Story = {
  args: {
    name: 'Alice',
    bpm: 85,
    percentMax: 45,
    background: '#4caf50',
  },
}

export const CardioZone: Story = {
  args: {
    name: 'Charlie',
    bpm: 150,
    percentMax: 78,
    background: '#ff9800',
  },
}

export const PeakZone: Story = {
  args: {
    name: 'Diana',
    bpm: 185,
    percentMax: 95,
    background: '#f44336',
  },
}
