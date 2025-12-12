import type { Meta, StoryObj } from '@storybook/react'
import HrmTiles from './HrmTiles'

const meta: Meta<typeof HrmTiles> = {
  title: 'Components/HrmTiles',
  component: HrmTiles,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof HrmTiles>

export const Default: Story = {
  args: {
    // TODO: Add default props here
  },
}
