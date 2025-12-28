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
  const setup = () => {
    render(
      <UserSettingsProvider>
        <SettingsPage />
      </UserSettingsProvider>
    )
    return screen.getByLabelText(/Weight \(kg\)/i)
  }

  it('renders the settings page with the weight input', () => {
    const weightInput = setup()
    expect(weightInput).toBeInTheDocument()
  })

  it('updates the weight successfully with a valid input', () => {
    const weightInput = setup()
    fireEvent.change(weightInput, { target: { value: '80' } })
    fireEvent.blur(weightInput)
    expect(weightInput).toHaveValue(80)
    expect(screen.queryByText(/Invalid weight/)).not.toBeInTheDocument()
  })

  it('shows an error for weights below the minimum', () => {
    const weightInput = setup()
    fireEvent.change(weightInput, { target: { value: '19' } })
    fireEvent.blur(weightInput)
    expect(
      screen.getByText('Invalid weight. Must be between 20 and 300.')
    ).toBeInTheDocument()
  })

  it('shows an error for weights above the maximum', () => {
    const weightInput = setup()
    fireEvent.change(weightInput, { target: { value: '301' } })
    fireEvent.blur(weightInput)
    expect(
      screen.getByText('Invalid weight. Must be between 20 and 300.')
    ).toBeInTheDocument()
  })

  it('accepts the minimum valid weight', () => {
    const weightInput = setup()
    fireEvent.change(weightInput, { target: { value: '20' } })
    fireEvent.blur(weightInput)
    expect(weightInput).toHaveValue(20)
    expect(screen.queryByText(/Invalid weight/)).not.toBeInTheDocument()
  })

  it('accepts the maximum valid weight', () => {
    const weightInput = setup()
    fireEvent.change(weightInput, { target: { value: '300' } })
    fireEvent.blur(weightInput)
    expect(weightInput).toHaveValue(300)
    expect(screen.queryByText(/Invalid weight/)).not.toBeInTheDocument()
  })

  it('shows a "Weight is required" error for non-numeric input', () => {
    const weightInput = setup()
    fireEvent.change(weightInput, { target: { value: 'abc' } })
    fireEvent.blur(weightInput)
    expect(screen.getByText('Weight is required.')).toBeInTheDocument()
  })

  it('shows a "Weight is required" error for empty input', () => {
    const weightInput = setup()
    fireEvent.change(weightInput, { target: { value: '' } })
    fireEvent.blur(weightInput)
    expect(screen.getByText('Weight is required.')).toBeInTheDocument()
  })
})
