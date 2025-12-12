import type { Meta, StoryObj } from '@storybook/react'
import VolumeControl from './VolumeControl'

const meta: Meta<typeof VolumeControl> = {
  title: 'Components/Spotify/VolumeControl',
  component: VolumeControl,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof VolumeControl>

export const Default: Story = {
  args: {
    // TODO: Add default props here
  },
}
