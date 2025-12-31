/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import UserSettings from './UserSettings'
import { MeasurementSystem } from '../../../types'

describe('UserSettings', () => {
  const mockProps = {
    userName: 'John Doe',
    setUserName: jest.fn(),
    userAge: '30',
    setUserAge: jest.fn(),
    onAgeBlur: jest.fn(),
    ageError: null,
    userHeight: { cm: '175', feet: '5', inches: '9' },
    setUserHeight: jest.fn(),
    onHeightBlur: jest.fn(),
    heightError: null,
    userWeight: '70',
    setUserWeight: jest.fn(),
    onWeightBlur: jest.fn(),
    weightError: null,
    unit: 'METRIC' as MeasurementSystem,
    setUnit: jest.fn(),
  }

  it('should render all fields correctly', () => {
    render(<UserSettings {...mockProps} />)
    expect(screen.getByLabelText('Your Name')).toHaveValue('John Doe')
    expect(screen.getByLabelText('Your Age')).toHaveValue(30)
    expect(screen.getByLabelText('Your Height (cm)')).toHaveValue(175)
    expect(
      screen.getByLabelText('Your Weight (kg)')
    ).toHaveValue(70)
  })

  it('should switch to imperial units and display feet/inches fields', () => {
    const { rerender } = render(<UserSettings {...mockProps} />)
    rerender(<UserSettings {...mockProps} unit="IMPERIAL" />)
    expect(screen.getByLabelText('Feet')).toHaveValue(5)
    expect(screen.getByLabelText('Inches')).toHaveValue(9)
  })

  it('should call setUnit when unit toggle is clicked', () => {
    render(<UserSettings {...mockProps} />)
    fireEvent.click(screen.getByText('Imperial (lbs, ft, in)'))
    expect(mockProps.setUnit).toHaveBeenCalledWith('IMPERIAL')
  })

  it('should validate height input correctly', () => {
    render(<UserSettings {...mockProps} />)
    const heightInput = screen.getByLabelText('Your Height (cm)')
    fireEvent.change(heightInput, { target: { value: '175a' } })
    expect(mockProps.setUserHeight).not.toHaveBeenCalled()
  })
})
