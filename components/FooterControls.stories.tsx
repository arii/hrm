import type { Meta, StoryObj } from '@storybook/react'
import FooterControls from './FooterControls'

const meta: Meta<typeof FooterControls> = {
  title: 'Components/FooterControls',
  component: FooterControls,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof FooterControls>

export const Default: Story = {
  args: {},
}
