import type { Meta, StoryObj } from '@storybook/react';
import HrTile from '../components/HrTile';

const meta: Meta<typeof HrTile> = {
  title: 'Components/HrTile',
  component: HrTile,
  tags: ['autodocs'],
  argTypes: {
    name: { control: 'text' },
    bpm: { control: 'number' },
    percentMax: { control: 'number' },
    calories: { control: 'number' },
    isConnected: { control: 'boolean' },
    isAlerting: { control: 'boolean' },
    alertMessage: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof HrTile>;

export const Default: Story = {
  args: {
    name: 'Default User',
    bpm: 120,
    percentMax: 65,
    calories: 150,
    isConnected: true,
    isAlerting: false,
    alertMessage: '',
  },
};

export const Disconnected: Story = {
  args: {
    ...Default.args,
    isConnected: false,
  },
};

export const Alerting: Story = {
  args: {
    ...Default.args,
    isAlerting: true,
    alertMessage: 'Signal weak...',
  },
};

export const HighHeartRate: Story = {
  args: {
    ...Default.args,
    bpm: 180,
    percentMax: 95,
  },
};

export const LowHeartRate: Story = {
  args: {
    ...Default.args,
    bpm: 60,
    percentMax: 35,
  },
};

export const NoName: Story = {
  args: {
    ...Default.args,
    name: '',
  },
};
