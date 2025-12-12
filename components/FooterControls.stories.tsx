import type { Meta, StoryObj } from '@storybook/react'
import FooterControls from './FooterControls'

const meta: Meta<typeof FooterControls> = {
  title: 'Components/FooterControls',
  component: FooterControls,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof FooterControls>

export const Default: Story = {
  args: {
    // TODO: Add default props here
  },
}
