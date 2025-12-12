import type { Meta, StoryObj } from '@storybook/react'
import PlaylistSelector from './PlaylistSelector'

const meta: Meta<typeof PlaylistSelector> = {
  title: 'Components/PlaylistSelector',
  component: PlaylistSelector,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof PlaylistSelector>

export const Default: Story = {
  args: {
    // TODO: Add default props here
  },
}
