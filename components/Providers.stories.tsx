import type { Meta, StoryObj } from '@storybook/react'
import Providers from './Providers'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

const meta: Meta<typeof Providers> = {
  title: 'Components/Providers',
  component: Providers,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Providers>

export const Default: Story = {
  args: {
    children: (
        <Box sx={{ p: 4, border: '1px solid grey' }}>
            <Typography variant="h4">Context Provided Content</Typography>
            <Typography>
                This content is wrapped in SessionProvider, WebSocketProvider, and ThemeProvider.
            </Typography>
        </Box>
    )
  },
}
