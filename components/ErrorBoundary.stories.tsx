import type { Meta, StoryObj } from '@storybook/react'
import ErrorBoundary from './ErrorBoundary'
import Typography from '@mui/material/Typography'

const meta: Meta<typeof ErrorBoundary> = {
  title: 'Components/ErrorBoundary',
  component: ErrorBoundary,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ErrorBoundary>

const BuggyComponent = () => {
    throw new Error('I crashed!')
}

export const Default: Story = {
  args: {
    fallback: <Typography color="error">Something went wrong (Fallback UI)</Typography>,
    children: <Typography>Everything is fine (Child Content)</Typography>
  },
}

export const WithError: Story = {
  args: {
    fallback: <Typography color="error">Something went wrong (Fallback UI)</Typography>,
    children: <BuggyComponent />
  },
}
