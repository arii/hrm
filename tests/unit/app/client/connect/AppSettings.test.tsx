/** @jest-environment jsdom */
import React from 'react'
import { render, screen } from '@testing-library/react'
import AppSettings from '../../../../../app/client/connect/AppSettings'

describe('AppSettings', () => {
  const mockProps = {
    userName: '',
    setUserName: jest.fn(),
    userAge: '',
    setUserAge: jest.fn(),
    userHeight: 0,
    setUserHeight: jest.fn(),
    userWeight: '',
    setUserWeight: jest.fn(),
    unit: 'IMPERIAL' as const,
    setUnit: jest.fn(),
    gender: 'MALE' as const,
    setGender: jest.fn(),
    ageError: null,
    weightError: null,
    feet: '5',
    setFeet: jest.fn(),
    inches: '9',
    setInches: jest.fn(),
  }

  it('renders the component with imperial units by default', () => {
    render(<AppSettings {...mockProps} />)
    expect(screen.getByLabelText('imperial units')).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByLabelText('Feet')).toBeInTheDocument()
    expect(screen.getByLabelText('Inches')).toBeInTheDocument()
    expect(screen.queryByLabelText('Your Height (cm)')).not.toBeInTheDocument()
  })

  it('renders the component with metric units when specified', () => {
    render(<AppSettings {...mockProps} unit="METRIC" />)
    expect(screen.getByLabelText('metric units')).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByLabelText('Your Height (cm)')).toBeInTheDocument()
    expect(screen.queryByLabelText('Feet')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Inches')).not.toBeInTheDocument()
  })

  it('displays error messages for age and weight', () => {
    render(
      <AppSettings
        {...mockProps}
        ageError="Invalid age"
        weightError="Invalid weight"
      />
    )
    expect(screen.getByText('Invalid age')).toBeInTheDocument()
    expect(screen.getByText('Invalid weight')).toBeInTheDocument()
  })
})
