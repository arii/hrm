/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import UserSettings from './UserSettings'

describe('UserSettings', () => {
  const mockSetUserName = jest.fn()
  const mockSetUserAge = jest.fn()
  const mockOnAgeBlur = jest.fn()
  const mockSetUserHeight = jest.fn()
  const mockOnHeightBlur = jest.fn()
  const mockSetUserWeight = jest.fn()
  const mockOnWeightBlur = jest.fn()
  const mockSetUnit = jest.fn()

  const defaultProps = {
    userName: 'John Doe',
    setUserName: mockSetUserName,
    userAge: '30',
    setUserAge: mockSetUserAge,
    onAgeBlur: mockOnAgeBlur,
    ageError: null,
    userHeight: { cm: '175', feet: '5', inches: '9' },
    setUserHeight: mockSetUserHeight,
    onHeightBlur: mockOnHeightBlur,
    heightError: null,
    userWeight: '70',
    setUserWeight: mockSetUserWeight,
    onWeightBlur: mockOnWeightBlur,
    weightError: null,
    unit: 'METRIC' as 'METRIC' | 'IMPERIAL',
    setUnit: mockSetUnit,
  }

  it('should render all fields correctly in METRIC mode', () => {
    render(<UserSettings {...defaultProps} />)
    expect(screen.getByLabelText('Your Name')).toHaveValue('John Doe')
    expect(screen.getByLabelText('Your Age')).toHaveValue(30)
    expect(screen.getByLabelText('Your Height (cm)')).toHaveValue(175)
    expect(screen.getByLabelText('Your Weight (kg)')).toHaveValue(70)
  })

  it('should render all fields correctly in IMPERIAL mode', () => {
    render(<UserSettings {...defaultProps} unit="IMPERIAL" />)
    expect(screen.getByLabelText('Feet')).toHaveValue(5)
    expect(screen.getByLabelText('Inches')).toHaveValue(9)
    expect(screen.getByLabelText('Your Weight (lbs)')).toHaveValue(70)
  })

  it('should call the correct setters on input change', () => {
    render(<UserSettings {...defaultProps} />)

    fireEvent.change(screen.getByLabelText('Your Name'), {
      target: { value: 'Jane Doe' },
    })
    expect(mockSetUserName).toHaveBeenCalledWith('Jane Doe')

    fireEvent.change(screen.getByLabelText('Your Age'), {
      target: { value: '31' },
    })
    expect(mockSetUserAge).toHaveBeenCalledWith('31')

    fireEvent.change(screen.getByLabelText('Your Height (cm)'), {
      target: { value: '180' },
    })
    expect(mockSetUserHeight).toHaveBeenCalledWith({ cm: '180' })
  })

  it('should switch between METRIC and IMPERIAL units', () => {
    render(<UserSettings {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'imperial units' }))
    expect(mockSetUnit).toHaveBeenCalledWith('IMPERIAL')
  })
})
