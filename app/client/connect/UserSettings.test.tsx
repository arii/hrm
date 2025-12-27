import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import UserSettings from './UserSettings'

describe('UserSettings Component', () => {
  const mockSetUserName = jest.fn()
  const mockSetUserAge = jest.fn()
  const mockSetUserHeight = jest.fn()
  const mockSetUserWeight = jest.fn()
  const mockSetUnit = jest.fn()
  const mockValidateAge = jest.fn()
  const mockValidateHeight = jest.fn()
  const mockValidateWeight = jest.fn()

  const defaultProps = {
    userName: 'John Doe',
    setUserName: mockSetUserName,
    userAge: '30',
    setUserAge: mockSetUserAge,
    userHeight: 175,
    setUserHeight: mockSetUserHeight,
    userWeight: '70',
    setUserWeight: mockSetUserWeight,
    unit: 'METRIC' as 'METRIC' | 'IMPERIAL',
    setUnit: mockSetUnit,
    ageError: null,
    heightError: null,
    weightError: null,
    validateAge: mockValidateAge,
    validateHeight: mockValidateHeight,
    validateWeight: mockValidateWeight,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all fields with correct initial values', () => {
    render(<UserSettings {...defaultProps} />)
    expect(screen.getByLabelText('Your Name')).toHaveValue('John Doe')
    expect(screen.getByLabelText('Your Age')).toHaveValue(30)
    expect(screen.getByLabelText('Your Height (cm)')).toHaveValue(175)
    expect(screen.getByLabelText('Your Weight (kg)')).toHaveValue(70)
  })

  it('calls the correct setters on input change', () => {
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
    expect(mockSetUserHeight).toHaveBeenCalledWith(180)

    fireEvent.change(screen.getByLabelText('Your Weight (kg)'), {
      target: { value: '75' },
    })
    expect(mockSetUserWeight).toHaveBeenCalledWith('75')
  })

  it('switches between METRIC and IMPERIAL units', () => {
    const { rerender } = render(<UserSettings {...defaultProps} />)
    expect(screen.getByLabelText('Your Height (cm)')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /imperial/i }))
    expect(mockSetUnit).toHaveBeenCalledWith('IMPERIAL')

    rerender(<UserSettings {...defaultProps} unit="IMPERIAL" />)

    expect(screen.getByLabelText('Feet')).toBeInTheDocument()
    expect(screen.getByLabelText('Inches')).toBeInTheDocument()
    expect(screen.getByLabelText(/Your Weight \(lbs\)/)).toBeInTheDocument()
  })

  it('converts height from CM to feet and inches when switching to IMPERIAL', async () => {
    const { rerender } = render(<UserSettings {...defaultProps} />) // 175cm

    fireEvent.click(screen.getByRole('button', { name: /imperial/i }))
    expect(mockSetUnit).toHaveBeenCalledWith('IMPERIAL')

    rerender(<UserSettings {...defaultProps} unit="IMPERIAL" />)

    // 175cm is approx 5ft 9in
    expect(await screen.findByLabelText('Feet')).toHaveValue(5)
    expect(await screen.findByLabelText('Inches')).toHaveValue(9)
  })

  it('converts height from feet and inches to CM when changing imperial inputs', () => {
    render(<UserSettings {...defaultProps} unit="IMPERIAL" />)

    fireEvent.change(screen.getByLabelText('Feet'), { target: { value: '6' } })
    fireEvent.change(screen.getByLabelText('Inches'), {
      target: { value: '0' },
    })

    // 6ft 0in is approx 183cm
    expect(mockSetUserHeight).toHaveBeenLastCalledWith(182.88)
  })

  it('calls validation functions on blur', () => {
    render(<UserSettings {...defaultProps} />)

    fireEvent.blur(screen.getByLabelText('Your Age'))
    expect(mockValidateAge).toHaveBeenCalledWith('30')

    fireEvent.blur(screen.getByLabelText('Your Height (cm)'))
    expect(mockValidateHeight).toHaveBeenCalledWith('175')

    fireEvent.blur(screen.getByLabelText('Your Weight (kg)'))
    expect(mockValidateWeight).toHaveBeenCalledWith('70')
  })
})
