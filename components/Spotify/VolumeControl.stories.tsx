import type { Meta, StoryObj } from '@storybook/react'
import VolumeControl from './VolumeControl'

const meta: Meta<typeof VolumeControl> = {
  title: 'Components/Spotify/VolumeControl',
  component: VolumeControl,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onVolumeChange: { action: 'volume changed' },
    onVolumeChangeCommitted: { action: 'volume committed' },
  },
}

export default meta
type Story = StoryObj<typeof VolumeControl>

export const Default: Story = {
  args: {
    volume: 50,
  },
}
