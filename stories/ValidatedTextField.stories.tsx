import React from 'react';
import { Story, Meta } from '@storybook/react';
import ValidatedTextField from '../components/forms/ValidatedTextField';
import { UserSettingsSchema } from '../lib/validation/userSettingsValidation';

export default {
  title: 'Forms/ValidatedTextField',
  component: ValidatedTextField,
} as Meta;

const Template: Story = (args) => <ValidatedTextField {...args} />;

export const Default = Template.bind({});
Default.args = {
  label: 'User Name',
  fieldName: 'userName',
  schema: UserSettingsSchema,
  helperText: 'Enter your name.',
};

export const WithError = Template.bind({});
WithError.args = {
  label: 'User Age',
  fieldName: 'userAge',
  schema: UserSettingsSchema,
  helperText: 'Enter an age between 1 and 120.',
  type: 'number',
};
