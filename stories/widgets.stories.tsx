import React from 'react'
import { Meta, StoryFn } from '@storybook/react'
import { Box, Typography } from '@mui/material'
import DashboardWidget from '../components/widgets/DashboardWidget'
import DataWidget from '../components/widgets/DataWidget'
import CardWidget from '../components/widgets/CardWidget'

export default {
  title: 'Widgets/Dashboard',
  component: DashboardWidget,
  subcomponents: { DataWidget, CardWidget },
  argTypes: {
    title: { control: 'text' },
  },
} as Meta

const Template: StoryFn = (args) => (
  <Box sx={{ p: 2, maxWidth: '600px' }}>
    <DashboardWidget {...args}>
      <Typography>Inner Content</Typography>
    </DashboardWidget>
  </Box>
)

export const DefaultDashboardWidget = Template.bind({})
DefaultDashboardWidget.args = {
  title: 'Dashboard Widget',
}

export const WithDataWidget: StoryFn = (args) => (
  <Box sx={{ p: 2, maxWidth: '600px' }}>
    <DashboardWidget {...args}>
      <DataWidget
        data={[
          { label: 'Metric 1', value: 123 },
          { label: 'Metric 2', value: 'ABC' },
          { label: 'Metric 3', value: 45.67 },
        ]}
      />
    </DashboardWidget>
  </Box>
)
WithDataWidget.args = {
  title: 'Data Widget',
}

export const WithCardWidget: StoryFn = (args) => (
  <Box sx={{ p: 2, maxWidth: '600px' }}>
    <CardWidget {...args}>
      <Typography variant="h5">Card Widget</Typography>
      <Typography>This is a card-based widget.</Typography>
    </CardWidget>
  </Box>
)
WithCardWidget.args = {}
