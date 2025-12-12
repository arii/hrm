import type { Meta, StoryObj } from '@storybook/react'
import ThemeRegistry from './ThemeRegistry'

const meta: Meta<typeof ThemeRegistry> = {
  title: 'Components/ThemeRegistry/ThemeRegistry',
  component: ThemeRegistry,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ThemeRegistry>

export const Default: Story = {
  args: {
    // TODO: Add default props here
  },
}
