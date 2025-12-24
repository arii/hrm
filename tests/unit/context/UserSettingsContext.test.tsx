/**
 * @jest-environment jsdom
 */
// File: tests/unit/context/UserSettingsContext.test.tsx
import React from 'react'
import { render, fireEvent, screen } from '@testing-library/react'
import {
  UserSettingsProvider,
  useUserSettings,
} from '../../../context/UserSettingsContext'

const TestComponent = () => {
  const {
    unitSystem,
    setUnitSystem,
    userName,
    setUserName,
    userAge,
    setUserAge,
  } = useUserSettings()

  return (
    <div>
      <div data-testid="unit-system">{unitSystem}</div>
      <button onClick={() => setUnitSystem('metric')}>Set to Metric</button>
      <div data-testid="user-name">{userName}</div>
      <button onClick={() => setUserName('Test User')}>Set Name</button>
      <div data-testid="user-age">{userAge}</div>
      <button onClick={() => setUserAge(40)}>Set Age</button>
    </div>
  )
}

describe('UserSettingsContext', () => {
  it('should provide the default values', () => {
    render(
      <UserSettingsProvider>
        <TestComponent />
      </UserSettingsProvider>
    )

    expect(screen.getByTestId('unit-system').textContent).toBe('imperial')
    expect(screen.getByTestId('user-name').textContent).toBe('New User')
    expect(screen.getByTestId('user-age').textContent).toBe('30')
  })

  it('should update the unit system', () => {
    render(
      <UserSettingsProvider>
        <TestComponent />
      </UserSettingsProvider>
    )

    fireEvent.click(screen.getByText('Set to Metric'))
    expect(screen.getByTestId('unit-system').textContent).toBe('metric')
  })

  it('should update the user name', () => {
    render(
      <UserSettingsProvider>
        <TestComponent />
      </UserSettingsProvider>
    )

    fireEvent.click(screen.getByText('Set Name'))
    expect(screen.getByTestId('user-name').textContent).toBe('Test User')
  })

  it('should update the user age', () => {
    render(
      <UserSettingsProvider>
        <TestComponent />
      </UserSettingsProvider>
    )

    fireEvent.click(screen.getByText('Set Age'))
    expect(screen.getByTestId('user-age').textContent).toBe('40')
  })
})
