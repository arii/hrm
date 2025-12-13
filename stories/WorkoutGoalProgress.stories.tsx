// stories/WorkoutGoalProgress.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import WorkoutGoalProgress from '../components/WorkoutGoalProgress'

const meta: Meta<typeof WorkoutGoalProgress> = {
  title: 'Components/WorkoutGoalProgress',
  component: WorkoutGoalProgress,
  argTypes: {
    currentProgress: { control: 'number' },
    targetGoal: { control: 'number' },
    label: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof WorkoutGoalProgress>

export const Default: Story = {
  args: {
    currentProgress: 50,
    targetGoal: 100,
    label: 'Calories Burned',
  },
}

export const Empty: Story = {
    args: {
      currentProgress: 0,
      targetGoal: 100,
      label: 'Workout Duration (minutes)',
    },
  }

export const Full: Story = {
  args: {
    currentProgress: 10,
    targetGoal: 10,
    label: 'Active Days',
  },
}

export const Overfilled: Story = {
    args: {
      currentProgress: 150,
      targetGoal: 100,
      label: 'Distance (km)',
    },
  }

export const ZeroTarget: Story = {
    args: {
        currentProgress: 50,
        targetGoal: 0,
        label: 'Invalid Goal',
    },
}
