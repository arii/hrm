import type { Meta, StoryObj } from '@storybook/react'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import type { ButtonProps } from '@mui/material/Button'

const meta: Meta<typeof Button> = {
  title: 'MUI/Button',
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
    color: {
      control: {
        type: 'select',
      },
      options: ['primary', 'secondary', 'success', 'error', 'info', 'warning'],
    },
    disabled: {
      control: 'boolean',
    },
    children: {
      control: 'text',
    },
  },
  args: {
    children: 'Button',
    disabled: false,
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Contained: Story = {
  args: {
    variant: 'contained',
  },
}

export const Outlined: Story = {
  args: {
    variant: 'outlined',
  },
}

export const Text: Story = {
  args: {
    variant: 'text',
  },
}

const AllButtonVariants = (props: ButtonProps) => (
  <Box sx={{ '& button': { m: 1 } }}>
    <div>
      <Button {...props} variant="text">
        Text
      </Button>
      <Button {...props} variant="contained">
        Contained
      </Button>
      <Button {...props} variant="outlined">
        Outlined
      </Button>
    </div>
  </Box>
)

export const AllVariants: Story = {
  render: (args) => <AllButtonVariants {...args} />,
  args: {
    color: 'primary',
  },
}

const AllButtonSizes = (props: ButtonProps) => (
  <Box sx={{ '& button': { m: 1 } }}>
    <div>
      <Button {...props} size="small">
        Small
      </Button>
      <Button {...props} size="medium">
        Medium
      </Button>
      <Button {...props} size="large">
        Large
      </Button>
    </div>
  </Box>
)

export const AllSizes: Story = {
  render: (args) => <AllButtonSizes {...args} />,
  args: {
    variant: 'contained',
    color: 'primary',
  },
}
