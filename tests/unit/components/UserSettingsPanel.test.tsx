/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { UserSettingsProvider } from '@/context/UserSettingsContext'
import UserSettingsPanel from '@/components/UserSettingsPanel'
import userEvent from '@testing-library/user-event'

describe('UserSettingsPanel', () => {
  it('renders all input fields', () => {
    render(
      <UserSettingsProvider>
        <UserSettingsPanel />
      </UserSettingsProvider>
    )

    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Age')).toBeInTheDocument()
    expect(screen.getByLabelText('Height (cm)')).toBeInTheDocument()
    expect(screen.getByLabelText('Weight (kg)')).toBeInTheDocument()
    expect(screen.getByLabelText('Gender')).toBeInTheDocument()
  })

  it('updates user settings on input change', async () => {
    const user = userEvent.setup()
    render(
      <UserSettingsProvider>
        <UserSettingsPanel />
      </UserSettingsProvider>
    )

    const nameInput = screen.getByLabelText('Name')
    await user.type(nameInput, 'John Doe')
    expect(nameInput).toHaveValue('John Doe')

    const ageInput = screen.getByLabelText('Age')
    await user.type(ageInput, '35')
    expect(ageInput).toHaveValue(35)

    const heightInput = screen.getByLabelText('Height (cm)')
    await user.type(heightInput, '180')
    expect(heightInput).toHaveValue(180)

    const weightInput = screen.getByLabelText('Weight (kg)')
    await user.type(weightInput, '80')
    expect(weightInput).toHaveValue(80)

    const genderSelect = screen.getByLabelText('Gender')
    await user.click(genderSelect)
    const maleOption = await screen.findByRole('option', { name: 'Male' })
    await user.click(maleOption)
    // Re-query the element to get the updated state
    expect(screen.getByLabelText('Gender')).toHaveTextContent('Male')
  })
})
