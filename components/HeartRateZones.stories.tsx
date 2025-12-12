import type { Meta, StoryObj } from '@storybook/react'
import HeartRateZones from './HeartRateZones'

const meta: Meta<typeof HeartRateZones> = {
  title: 'Components/HeartRateZones',
  component: HeartRateZones,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof HeartRateZones>

export const Default: Story = {
  args: {
    // TODO: Add default props here
  },
}
