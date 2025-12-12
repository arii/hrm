import type { Meta, StoryObj } from '@storybook/react'
import WorkoutTableViewer from './WorkoutTableViewer'

const meta: Meta<typeof WorkoutTableViewer> = {
  title: 'Components/WorkoutTableViewer',
  component: WorkoutTableViewer,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof WorkoutTableViewer>

export const Default: Story = {
  args: {
    // TODO: Add default props here
  },
}
