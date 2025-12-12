import type { Meta, StoryObj } from '@storybook/react'
import PlaylistSelector from './PlaylistSelector'

const meta: Meta<typeof PlaylistSelector> = {
  title: 'Components/Spotify/PlaylistSelector',
  component: PlaylistSelector,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onPlaylistSelected: { action: 'playlist selected' },
    onPlaylistPlay: { action: 'playlist play' },
  },
}

export default meta
type Story = StoryObj<typeof PlaylistSelector>

export const Default: Story = {
  args: {
    // This component fetches data on mount, so props are minimal.
    // We would need MSW or similar to mock the fetch for a "real" story.
    // For now, providing the required callbacks satisfies the prop types.
  },
}
