import type { Meta, StoryObj } from '@storybook/react'
import VolumeSlider from './VolumeSlider'

const meta: Meta<typeof VolumeSlider> = {
  title: 'Components/PlaybackControls/VolumeSlider',
  component: VolumeSlider,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onVolumeChange: { action: 'volume changed' },
    onToggleMute: { action: 'toggled mute' },
  },
}

export default meta
type Story = StoryObj<typeof VolumeSlider>

export const Default: Story = {
  args: {
    volume: 75,
    muted: false,
  },
}

export const Muted: Story = {
  args: {
    volume: 0,
    muted: true,
  },
}
