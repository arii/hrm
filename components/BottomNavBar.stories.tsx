import type { Meta, StoryObj } from '@storybook/react'
import BottomNavBar from './BottomNavBar'

const meta: Meta<typeof BottomNavBar> = {
  title: 'Components/BottomNavBar',
  component: BottomNavBar,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof BottomNavBar>

export const Default: Story = {
  args: {
    // Component manages its own state and uses Next.js hooks (usePathname, Link).
    // Storybook handles these gracefully in most cases, or defaults are used.
  },
}
