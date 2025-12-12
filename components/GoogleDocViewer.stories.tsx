import type { Meta, StoryObj } from '@storybook/react'
import GoogleDocViewer from './GoogleDocViewer'

const meta: Meta<typeof GoogleDocViewer> = {
  title: 'Components/GoogleDocViewer',
  component: GoogleDocViewer,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof GoogleDocViewer>

export const Default: Story = {
  args: {
    // TODO: Add default props here
  },
}
