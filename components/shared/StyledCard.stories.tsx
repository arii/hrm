import type { Meta, StoryObj } from '@storybook/react'
import StyledCard from './StyledCard'

const meta: Meta<typeof StyledCard> = {
  title: 'Components/StyledCard',
  component: StyledCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof StyledCard>

export const Default: Story = {
  args: {
    // TODO: Add default props here
  },
}
