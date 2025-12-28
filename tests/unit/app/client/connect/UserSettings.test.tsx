/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import UserSettings from '../../../../../app/client/connect/UserSettings'
import { MeasurementSystem, Gender } from '../../../../../types'

describe('UserSettings', () => {
  const defaultProps = {
    userName: 'Test User',
    setUserName: jest.fn(),
    userAge: '30',
    setUserAge: jest.fn(),
    weightInKg: '70',
    setWeightInKg: jest.fn(),
    heightInCm: '175',
    setHeightInCm: jest.fn(),
    gender: 'MALE' as Gender,
    setGender: jest.fn(),
    unitSystem: 'IMPERIAL' as MeasurementSystem,
    setUnitSystem: jest.fn(),
  }

  it('renders all the form fields', () => {
    render(<UserSettings {...defaultProps} />)
    expect(screen.getByLabelText('Your Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Your Age')).toBeInTheDocument()
    expect(screen.getByLabelText('Unit system')).toBeInTheDocument()
    expect(screen.getByLabelText('Feet')).toBeInTheDocument()
    expect(screen.getByLabelText('Inches')).toBeInTheDocument()
    expect(screen.getByLabelText('Your Weight (lbs)')).toBeInTheDocument()
  })

  it('switches to metric units when the toggle is clicked', () => {
    render(<UserSettings {...defaultProps} />)
    fireEvent.click(screen.getByText('Metric (kg, cm)'))
    expect(defaultProps.setUnitSystem).toHaveBeenCalledWith('METRIC')
  })
})
