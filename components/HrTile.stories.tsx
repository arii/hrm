import type { Meta, StoryObj } from '@storybook/nextjs'
import HrTile from './HrTile'

const meta = {
  title: 'Components/HrTile',
  component: HrTile,
  tags: ['autodocs'],
  argTypes: {
    percentMax: { control: { type: 'range', min: 0, max: 100 } },
    bpm: { control: { type: 'number', min: 0, max: 220 } },
  },
} satisfies Meta<typeof HrTile>

export default meta
type Story = StoryObj<typeof meta>

export const Resting: Story = {
  args: {
    name: 'User 1',
    bpm: 65,
    percentMax: 35,
  },
}

export const HighIntensity: Story = {
  args: {
    name: 'Athlete A',
    bpm: 185,
    percentMax: 95,
  },
}

export const LongNameTruncation: Story = {
  args: {
    name: 'Christopher "The Machine" Richardson',
    bpm: 120,
    percentMax: 60,
  },
}
