import type { Meta, StoryObj } from '@storybook/react'
import SpotifyDisplay from './SpotifyDisplay'

const meta: Meta<typeof SpotifyDisplay> = {
  title: 'Components/SpotifyDisplay',
  component: SpotifyDisplay,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof SpotifyDisplay>

export const Default: Story = {
  args: {
    // TODO: Add default props here
  },
}
