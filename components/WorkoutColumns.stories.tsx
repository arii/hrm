import type { Meta, StoryObj } from '@storybook/react'
import WorkoutColumns from './WorkoutColumns'

const meta: Meta<typeof WorkoutColumns> = {
  title: 'Components/WorkoutColumns',
  component: WorkoutColumns,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof WorkoutColumns>

export const Default: Story = {
  args: {
    columns: [
      {
        title: 'Strength',
        items: [
          { title: 'Squats', details: '3x10 @ 100kg' },
          { title: 'Deadlifts', details: '3x5 @ 120kg' },
        ],
      },
      {
        title: 'Cardio',
        items: [
          { title: 'Run', details: '5km zone 2' },
          { title: 'Rowing', details: '2000m time trial' },
        ],
      },
    ],
  },
}
