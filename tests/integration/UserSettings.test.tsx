import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import UserSettings from '../../app/client/connect/UserSettings'

describe('UserSettings', () => {
  it('should convert height from metric to imperial and back', () => {
    const setUserHeight = jest.fn()
    const setUnit = jest.fn()

    const { rerender } = render(
      <UserSettings
        userName=""
        setUserName={() => {}}
        userAge=""
        setUserAge={() => {}}
        userHeight={175}
        setUserHeight={setUserHeight}
        userWeight=""
        setUserWeight={() => {}}
        unit="METRIC"
        setUnit={setUnit}
        heightError={null}
      />
    )

    fireEvent.click(screen.getByText('Imperial (lbs, ft, in)'))

    rerender(
      <UserSettings
        userName=""
        setUserName={() => {}}
        userAge=""
        setUserAge={() => {}}
        userHeight={175}
        setUserHeight={setUserHeight}
        userWeight=""
        setUserWeight={() => {}}
        unit="IMPERIAL"
        setUnit={setUnit}
        heightError={null}
      />
    )

    expect(screen.getByLabelText('Feet')).toHaveValue('5')
    expect(screen.getByLabelText('Inches')).toHaveValue('9')

    fireEvent.click(screen.getByText('Metric (kg, cm)'))

    rerender(
      <UserSettings
        userName=""
        setUserName={() => {}}
        userAge=""
        setUserAge={() => {}}
        userHeight={175}
        setUserHeight={setUserHeight}
        userWeight=""
        setUserWeight={() => {}}
        unit="METRIC"
        setUnit={setUnit}
        heightError={null}
      />
    )

    expect(screen.getByLabelText('Your Height (cm)')).toHaveValue('175')
  })
})
