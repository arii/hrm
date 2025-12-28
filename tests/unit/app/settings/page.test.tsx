/**
 * @jest-environment jsdom
 */
// tests/unit/app/settings/page.test.tsx
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import SettingsPage from '@/app/settings/page'
import { UserSettingsProvider } from '@/context/UserSettingsContext'
import '@testing-library/jest-dom'

describe('SettingsPage', () => {
  it('renders the settings page and updates the weight on blur', () => {
    render(
      <UserSettingsProvider>
        <SettingsPage />
      </UserSettingsProvider>
    )

    const weightInput = screen.getByLabelText(/Weight \(kg\)/i)
    expect(weightInput).toBeInTheDocument()

    // Test valid input
    fireEvent.change(weightInput, { target: { value: '80' } })
    fireEvent.blur(weightInput)
    expect(weightInput).toHaveValue(80)

    // Test invalid input
    fireEvent.change(weightInput, { target: { value: '10' } })
    fireEvent.blur(weightInput)
    expect(
      screen.getByText('Invalid weight. Must be between 20 and 300.')
    ).toBeInTheDocument()

    // Test non-numeric input
    fireEvent.change(weightInput, { target: { value: 'abc' } })
    fireEvent.blur(weightInput)
    expect(
      screen.getByText('Invalid weight. Must be between 20 and 300.')
    ).toBeInTheDocument()

    // Test empty input
    fireEvent.change(weightInput, { target: { value: '' } })
    fireEvent.blur(weightInput)
    expect(
      screen.getByText('Invalid weight. Must be between 20 and 300.')
    ).toBeInTheDocument()
  })
})
