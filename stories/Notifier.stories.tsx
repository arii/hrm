import React from 'react'
import { Meta, StoryFn } from '@storybook/react'
import { Button, Box } from '@mui/material'
import { SnackbarProvider } from 'notistack'
import { useNotifier } from '../hooks/useNotifier'
import ThemeRegistry from '@/components/ThemeRegistry/ThemeRegistry'

export default {
  title: 'Components/Notifier',
  decorators: [
    (Story) => (
      <ThemeRegistry>
        <SnackbarProvider maxSnack={3}>
          <Story />
        </SnackbarProvider>
      </ThemeRegistry>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
} as Meta

const NotifierController: React.FC = () => {
  const { showNotification } = useNotifier()

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
        onClick={() => showNotification('This is an info message.', 'info')}
      >
        Show Info
      </Button>
      <Button
        variant="contained"
        color="success"
        onClick={() => showNotification('Operation successful!', 'success')}
      >
        Show Success
      </Button>
      <Button
        variant="contained"
        color="warning"
        onClick={() =>
          showNotification('Please check your input.', 'warning')
        }
      >
        Show Warning
      </Button>
      <Button
        variant="contained"
        color="error"
        onClick={() =>
          showNotification('An unexpected error occurred.', 'error')
        }
      >
        Show Error
      </Button>
    </Box>
  )
}

const Template: StoryFn = () => <NotifierController />

export const Default = Template.bind({})
