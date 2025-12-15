import React from 'react'
import { Meta, StoryFn } from '@storybook/react'
import { Button, Box } from '@mui/material'
import Toast from '../components/shared/Toast'
import { ToastProvider, useToast } from '../context/ToastContext'
import ThemeRegistry from '@/components/ThemeRegistry/ThemeRegistry'

export default {
  title: 'Components/Toast',
  component: Toast,
  decorators: [
    (Story) => (
      <ThemeRegistry>
        <ToastProvider>
          <Toast />
          <Story />
        </ToastProvider>
      </ThemeRegistry>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
} as Meta

const ToastController: React.FC = () => {
  const { showToast } = useToast()

  const handleShowStackedToasts = () => {
    showToast('First toast!', 'info')
    setTimeout(() => showToast('Second toast!', 'success'), 500)
    setTimeout(() => showToast('Third toast!', 'warning'), 1000)
  }

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}
    >
      <Button
        variant="contained"
        onClick={() => showToast('This is an info message.')}
      >
        Show Info
      </Button>
      <Button
        variant="contained"
        color="success"
        onClick={() => showToast('Operation successful!', 'success')}
      >
        Show Success
      </Button>
      <Button
        variant="contained"
        color="warning"
        onClick={() =>
          showToast('Please check your input.', 'warning')
        }
      >
        Show Warning
      </Button>
      <Button
        variant="contained"
        color="error"
        onClick={() =>
          showToast('An unexpected error occurred.', 'error')
        }
      >
        Show Error
      </Button>
      <Button variant="contained" onClick={handleShowStackedToasts}>
        Show Stacked Toasts
      </Button>
    </Box>
  )
}

const Template: StoryFn = () => <ToastController />

export const Default = Template.bind({})
