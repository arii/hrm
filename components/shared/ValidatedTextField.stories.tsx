// components/shared/ValidatedTextField.stories.tsx
import React from 'react'
import { Meta, StoryFn } from '@storybook/react'
import ValidatedTextField, {
  ValidatedTextFieldProps,
} from './ValidatedTextField'
import { Box } from '@mui/material'

export default {
  title: 'Components/ValidatedTextField',
  component: ValidatedTextField,
  argTypes: {
    label: { control: 'text' },
    validationRules: { control: 'object' },
    errorMessageOverrides: { control: 'object' },
  },
  decorators: [
    (Story) => (
      <Box sx={{ p: 2, maxWidth: 400 }}>
        <Story />
      </Box>
    ),
  ],
} as Meta

const Template: StoryFn<ValidatedTextFieldProps> = (args) => (
  <ValidatedTextField {...args} />
)

export const Default = Template.bind({})
Default.args = {
  label: 'Standard Field',
  fullWidth: true,
}

export const Required = Template.bind({})
Required.args = {
  label: 'Required Field',
  validationRules: ['required'],
  fullWidth: true,
}

export const Email = Template.bind({})
Email.args = {
  label: 'Email Field',
  validationRules: ['email'],
  fullWidth: true,
}

export const MinLength = Template.bind({})
MinLength.args = {
  label: 'Min Length Field',
  validationRules: [{ minLength: 5 }],
  fullWidth: true,
}

export const CustomErrorMessage = Template.bind({})
CustomErrorMessage.args = {
  label: 'Required Field',
  validationRules: ['required'],
  errorMessageOverrides: { required: 'This is a custom required message.' },
  fullWidth: true,
}
