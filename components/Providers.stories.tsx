import type { Meta, StoryObj } from '@storybook/react'
import Providers from './Providers'

const meta: Meta<typeof Providers> = {
  title: 'Components/Providers',
  component: Providers,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Providers>

export const Default: Story = {
  args: {
    // TODO: Add default props here
  },
}
