import type { Meta, StoryObj } from '@storybook/react'
import Typography from '@mui/material/Typography'
import StyledCard from './StyledCard'

const meta: Meta<typeof StyledCard> = {
  title: 'Components/shared/StyledCard',
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
    children: (
        <Typography>This is a styled card content</Typography>
    ),
  },
}
