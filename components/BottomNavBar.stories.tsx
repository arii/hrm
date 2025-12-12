import type { Meta, StoryObj } from '@storybook/react'
import BottomNavBar from './BottomNavBar'

const meta: Meta<typeof BottomNavBar> = {
  title: 'Components/BottomNavBar',
  component: BottomNavBar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof BottomNavBar>

export const Default: Story = {
  args: {
    // TODO: Add default props here
  },
}
