import type { Meta, StoryObj } from '@storybook/react'
import ErrorDisplay from './ErrorDisplay'

const meta: Meta<typeof ErrorDisplay> = {
  title: 'Components/ErrorDisplay',
  component: ErrorDisplay,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ErrorDisplay>

export const Default: Story = {
  args: {
    // TODO: Add default props here
  },
}
