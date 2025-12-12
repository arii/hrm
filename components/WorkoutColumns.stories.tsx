import type { Meta, StoryObj } from '@storybook/react'
import WorkoutColumns from './WorkoutColumns'

const meta: Meta<typeof WorkoutColumns> = {
  title: 'Components/WorkoutColumns',
  component: WorkoutColumns,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof WorkoutColumns>

export const Default: Story = {
  args: {
    // TODO: Add default props here
  },
}
