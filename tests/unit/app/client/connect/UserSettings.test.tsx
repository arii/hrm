/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import UserSettings from '../../../../../app/client/connect/UserSettings'
import React from 'react'

describe('UserSettings', () => {
  const defaultProps = {
    userName: 'Test',
    setUserName: jest.fn(),
    userAge: '25',
    setUserAge: jest.fn(),
    weightInKg: '70',
    setWeightInKg: jest.fn(),
    heightInCm: '175',
    setHeightInCm: jest.fn(),
    gender: 'MALE' as const,
    setGender: jest.fn(),
    unitSystem: 'METRIC' as const,
    onUnitChange: jest.fn(),
  }

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('validates age on blur and shows error', async () => {
    const { rerender } = render(<UserSettings {...defaultProps} />)
    const ageInput = screen.getByLabelText(/Age/i)

    // Simulate user typing an invalid age
    fireEvent.change(ageInput, { target: { value: '150' } })
    // Simulate parent state update
    rerender(<UserSettings {...defaultProps} userAge="150" />)
    fireEvent.blur(ageInput)

    await waitFor(() => {
      expect(
        screen.getByText('Please enter a valid age (1-120)')
      ).toBeInTheDocument()
    })
  })

  it('validates age on blur and clears error for valid age', async () => {
    const { rerender } = render(
      <UserSettings {...defaultProps} userAge="150" />
    )
    const ageInput = screen.getByLabelText(/Age/i)

    // Initially, the error should be shown on blur
    fireEvent.blur(ageInput)
    await waitFor(() => {
      expect(
        screen.getByText('Please enter a valid age (1-120)')
      ).toBeInTheDocument()
    })

    // Correct the age
    fireEvent.change(ageInput, { target: { value: '30' } })
    // Simulate parent state update
    rerender(<UserSettings {...defaultProps} userAge="30" />)
    fireEvent.blur(ageInput)

    await waitFor(() => {
      expect(
        screen.queryByText('Please enter a valid age (1-120)')
      ).not.toBeInTheDocument()
    })
  })

  it('converts weight display when unit changes from METRIC to IMPERIAL', () => {
    const { rerender } = render(
      <UserSettings {...defaultProps} weightInKg="100" unitSystem="METRIC" />
    )
    const weightInput = screen.getByLabelText(/Weight/i)
    expect(weightInput).toHaveValue(100)

    rerender(
      <UserSettings {...defaultProps} weightInKg="100" unitSystem="IMPERIAL" />
    )
    expect(screen.getByLabelText(/Weight/i).value).toContain('220.5')
  })

  it('converts height display when unit changes from METRIC to IMPERIAL', () => {
    const { rerender } = render(
      <UserSettings {...defaultProps} heightInCm="180" unitSystem="METRIC" />
    )
    expect(screen.getByLabelText(/Height \(cm\)/i)).toHaveValue(180)

    rerender(
      <UserSettings {...defaultProps} heightInCm="180" unitSystem="IMPERIAL" />
    )
    expect(screen.getByLabelText(/Feet/i)).toHaveValue(5)
    expect(screen.getByLabelText(/Inches/i).value).toContain('11')
  })

  it('validates height on blur (imperial) and saves as cm', async () => {
    render(<UserSettings {...defaultProps} unitSystem="IMPERIAL" />)
    const feetInput = screen.getByLabelText(/Feet/i)
    const inchesInput = screen.getByLabelText(/Inches/i)

    fireEvent.change(feetInput, { target: { value: '5' } })
    fireEvent.change(inchesInput, { target: { value: '11' } })
    fireEvent.blur(inchesInput)

    await waitFor(() => {
      expect(defaultProps.setHeightInCm).toHaveBeenCalledWith('180.34')
    })
  })

  it('updates display values when props are updated externally (state sync fix)', () => {
    const { rerender } = render(
      <UserSettings {...defaultProps} weightInKg="70" unitSystem="METRIC" />
    )
    const weightInput = screen.getByLabelText(/Weight/i)
    expect(weightInput).toHaveValue(70)

    rerender(
      <UserSettings {...defaultProps} weightInKg="85" unitSystem="METRIC" />
    )
    expect(weightInput).toHaveValue(85)
  })

  it('does NOT update display value from props if the input is focused', async () => {
    const { rerender } = render(
      <UserSettings {...defaultProps} weightInKg="70" unitSystem="METRIC" />
    )
    const weightInput = screen.getByLabelText(/Weight/i)

    fireEvent.focus(weightInput)
    fireEvent.change(weightInput, { target: { value: '75' } })
    rerender(
      <UserSettings {...defaultProps} weightInKg="85" unitSystem="METRIC" />
    )
    expect(weightInput).toHaveValue(75)

    fireEvent.blur(weightInput)
    await waitFor(() => {
      expect(defaultProps.setWeightInKg).toHaveBeenCalledWith('75.00')
    })

    rerender(
      <UserSettings {...defaultProps} weightInKg="90" unitSystem="METRIC" />
    )
    expect(weightInput).toHaveValue(90)
  })
})
