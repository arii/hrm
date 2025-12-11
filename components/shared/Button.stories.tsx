import type { Meta, StoryObj } from '@storybook/react'
import Button from '@mui/material/Button'
import { action } from '@storybook/addon-actions'

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: {
        type: 'select',
      },
      options: ['contained', 'outlined', 'text'],
    },
    size: {
      control: {
        type: 'select',
      },
      options: ['small', 'medium', 'large'],
    },
    disabled: {
      control: 'boolean',
    },
    children: {
      control: 'text',
    },
    onClick: { action: 'clicked' },
  },
  args: {
    children: 'Button',
    disabled: false,
    onClick: action('clicked'),
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: {
    variant: 'contained',
    color: 'primary',
  },
}

export const Secondary: Story = {
  args: {
    variant: 'outlined',
    color: 'secondary',
  },
}

export const Ghost: Story = {
  args: {
    variant: 'text',
  },
}

export const Small: Story = {
  args: {
    size: 'small',
    variant: 'contained',
  },
}

export const Medium: Story = {
  args: {
    size: 'medium',
    variant: 'contained',
  },
}

export const Large: Story = {
  args: {
    size: 'large',
    variant: 'contained',
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    variant: 'contained',
  },
}
