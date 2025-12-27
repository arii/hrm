/** @jest-environment jsdom */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AppSettings from '../../../../../app/client/connect/AppSettings'
import { Gender, MeasurementSystem } from '../../../../../types'

describe('AppSettings Integration Tests', () => {
  const mockProps = {
    userName: 'Test User',
    setUserName: jest.fn(),
    userAge: '30',
    setUserAge: jest.fn(),
    onAgeBlur: jest.fn(),
    ageError: null,
    userWeight: '70',
    setUserWeight: jest.fn(),
    onWeightBlur: jest.fn(),
    weightError: null,
    userHeight: 175, // cm
    setUserHeight: jest.fn(),
    onHeightBlur: jest.fn(),
    heightError: null,
    unit: 'METRIC' as MeasurementSystem,
    setUnit: jest.fn(),
    gender: 'MALE' as Gender,
    setGender: jest.fn(),
  }

  it('correctly converts height from cm to feet/inches when switching to imperial', async () => {
    const { rerender } = render(<AppSettings {...mockProps} />)

    // Initially metric, showing cm
    expect(screen.getByLabelText('Your Height (cm)')).toHaveValue(175)

    // Switch to imperial
    const imperialButton = screen.getByLabelText('imperial units')
    fireEvent.click(imperialButton)

    // Rerender with the new unit
    rerender(<AppSettings {...mockProps} unit="IMPERIAL" />)

    // Wait for the imperial fields to appear and have the correct values
    await waitFor(() => {
      expect(screen.getByLabelText('Feet')).toHaveValue(5)
      expect(screen.getByLabelText('Inches')).toHaveValue(9)
    })
  })

  it('correctly converts height from feet/inches to cm when switching to metric', async () => {
    const { rerender } = render(
      <AppSettings {...mockProps} unit="IMPERIAL" />
    )

    // Initially imperial, showing feet/inches
    await waitFor(() => {
      expect(screen.getByLabelText('Feet')).toHaveValue(5)
      expect(screen.getByLabelText('Inches')).toHaveValue(9)
    })

    // Change the feet value
    const feetInput = screen.getByLabelText('Feet')
    fireEvent.change(feetInput, { target: { value: '6' } })

    // Expect the setUserHeight to be called with the new cm value (~183 cm)
    await waitFor(() => {
      expect(mockProps.setUserHeight).toHaveBeenCalledWith(183)
    })

    // Switch to metric
    const metricButton = screen.getByLabelText('metric units')
    fireEvent.click(metricButton)

    // Rerender with the new unit and height
    rerender(<AppSettings {...mockProps} unit="METRIC" userHeight={183} />)

    // Check if the cm value is updated correctly
    expect(screen.getByLabelText('Your Height (cm)')).toHaveValue(183)
  })
})
