import type { Meta, StoryObj } from '@storybook/react'
import BottomNavBar from './BottomNavBar'

const meta: Meta<typeof BottomNavBar> = {
  title: 'Components/BottomNavBar',
  component: BottomNavBar,
  parameters: {
    layout: 'padded',
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/',
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof BottomNavBar>

export const Dashboard: Story = {
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/',
      },
    },
  },
  args: {},
}

export const Controls: Story = {
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/client/control',
      },
    },
  },
  args: {},
}

export const StreamHr: Story = {
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/client/connect',
      },
    },
  },
  args: {},
}
