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
  it('renders the settings page and updates the weight', () => {
    render(
      <UserSettingsProvider>
        <SettingsPage />
      </UserSettingsProvider>
    )

    const weightInput = screen.getByLabelText(/Weight \(kg\)/i)
    expect(weightInput).toBeInTheDocument()

    fireEvent.change(weightInput, { target: { value: '80' } })
    expect(weightInput).toHaveValue('80')

    fireEvent.change(weightInput, { target: { value: '10' } })
    expect(screen.getByText('Please enter a weight between 20 and 300 kg.')).toBeInTheDocument()

    fireEvent.change(weightInput, { target: { value: 'abc' } })
    expect(screen.getByText('Please enter a valid number.')).toBeInTheDocument()

    fireEvent.change(weightInput, { target: { value: '' } })
    expect(screen.getByText('Weight cannot be empty.')).toBeInTheDocument()
  })
})
