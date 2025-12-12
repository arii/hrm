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
    title: 'Example Document',
    embedUrl: 'https://docs.google.com/document/d/195Z9-3Q3Z5Z9-3Q3Z5Z9-3Q3Z5Z9-3Q/preview',
    height: 400,
    isShrunk: false,
  },
}
