import type { Meta, StoryObj } from '@storybook/react'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import ThemeRegistry from './ThemeRegistry'

const meta: Meta<typeof ThemeRegistry> = {
  title: 'Components/ThemeRegistry/ThemeRegistry',
  component: ThemeRegistry,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ThemeRegistry>

export const Default: Story = {
  args: {
    options: { key: 'mui' },
    children: (
        <Box sx={{ p: 4, border: '1px solid black', borderRadius: 2 }}>
            <Typography variant="h4" color="primary">Themed Component</Typography>
            <Typography>This text should be styled by the Material UI theme.</Typography>
        </Box>
    )
  },
}
