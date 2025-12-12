import type { Meta, StoryObj } from '@storybook/react'
import TimerDisplay from './TimerDisplay'

const meta: Meta<typeof TimerDisplay> = {
  title: 'Components/TimerDisplay',
  component: TimerDisplay,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof TimerDisplay>

export const Default: Story = {
  args: {
    // TODO: Add default props here
  },
}
