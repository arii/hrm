/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import ConnectionManager from '../../../../../app/client/connect/ConnectionManager'
import React from 'react'

describe('ConnectionManager', () => {
  const defaultProps = {
    onConnect: jest.fn(),
    onDisconnect: jest.fn(),
    isConnected: false,
    deviceStatus: 'disconnected',
    batteryLevel: null,
    isConnectable: true,
  }

  it('renders connect button when not connected', () => {
    render(<ConnectionManager {...defaultProps} />)
    expect(
      screen.getByRole('button', { name: 'Connect Bluetooth HRM' })
    ).toBeInTheDocument()
  })

  it('renders disconnect button when connected', () => {
    render(<ConnectionManager {...defaultProps} isConnected={true} />)
    expect(
      screen.getByRole('button', { name: 'Disconnect' })
    ).toBeInTheDocument()
  })

  it('disables the connect button when not connectable', () => {
    render(<ConnectionManager {...defaultProps} isConnectable={false} />)
    expect(
      screen.getByRole('button', { name: 'Enter Details to Connect' })
    ).toBeDisabled()
  })
})
