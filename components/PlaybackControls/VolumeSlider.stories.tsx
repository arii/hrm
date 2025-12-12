import type { Meta, StoryObj } from '@storybook/react'
import VolumeSlider from './VolumeSlider'

const meta: Meta<typeof VolumeSlider> = {
  title: 'Components/VolumeSlider',
  component: VolumeSlider,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof VolumeSlider>

export const Default: Story = {
  args: {
    // TODO: Add default props here
  },
}
