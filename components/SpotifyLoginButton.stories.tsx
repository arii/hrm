import type { Meta, StoryObj } from '@storybook/react'
import SpotifyLoginButton from './SpotifyLoginButton'

const meta: Meta<typeof SpotifyLoginButton> = {
  title: 'Components/SpotifyLoginButton',
  component: SpotifyLoginButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof SpotifyLoginButton>

export const Default: Story = {
  args: {},
}
