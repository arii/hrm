import type { Meta, StoryObj } from '@storybook/react'
import ErrorFallback from './ErrorFallback'

const meta: Meta<typeof ErrorFallback> = {
  title: 'Components/ErrorFallback',
  component: ErrorFallback,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ErrorFallback>

export const Default: Story = {
  args: {
    // TODO: Add default props here
  },
}
