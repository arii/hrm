import type { Meta, StoryObj } from '@storybook/react'
import ConnectView from '../app/client/connect/ConnectView'

const meta: Meta<typeof ConnectView> = {
  title: 'Pages/ConnectPage',
  component: ConnectView,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    onConnect: { action: 'connected' },
    onDisconnect: { action: 'disconnected' },
    onResetServer: { action: 'reset server' },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Disconnected: Story = {
  args: {
    userName: '',
    setUserName: () => {},
    userAge: '',
    setUserAge: () => {},
    isConnected: false,
    deviceStatus: 'Disconnected',
    batteryLevel: null,
    currentHR: 0,
    hrZoneProps: { percentage: 0, progressColor: 'grey' },
    connectionStatus: 'Connected',
    bluetoothConnected: false,
    onConnect: () => {},
    onDisconnect: () => {},
    onResetServer: () => {},
  },
}

export const Connecting: Story = {
  args: {
    ...Disconnected.args,
    userName: 'John Doe',
    userAge: '30',
    deviceStatus: 'Connecting...',
  },
}

export const Connected: Story = {
  args: {
    userName: 'John Doe',
    userAge: '30',
    setUserName: () => {},
    setUserAge: () => {},
    isConnected: true,
    deviceStatus: 'Connected',
    batteryLevel: 85,
    currentHR: 120,
    hrZoneProps: { percentage: 60, progressColor: '#ff9800' },
    connectionStatus: 'Connected',
    bluetoothConnected: true,
    onConnect: () => {},
    onDisconnect: () => {},
    onResetServer: () => {},
  },
}

export const ConnectedNoData: Story = {
  args: {
    ...Connected.args,
    currentHR: 0,
    deviceStatus: 'Connected',
  },
}

export const StaleData: Story = {
  args: {
    ...Connected.args,
    deviceStatus: 'Connection unstable (Stale Data). Reconnecting...',
    batteryLevel: 45,
  },
}
