/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import UserSettings from '@/app/client/connect/UserSettings'
import '@testing-library/jest-dom'
import { UserProfileState } from '@/types/connect'

describe('UserSettings', () => {
  const mockUserProfile: UserProfileState = {
    data: {
      userName: 'Test User',
      userAge: '30',
      userAgeNum: 30,
      userHeight: { cm: '175', feet: '5', inches: '9' },
      userHeightCm: 175,
      userWeight: '70',
      userWeightKg: 70,
      gender: 'MALE' as const,
      unitSystem: 'METRIC' as const,
    },
    handlers: {
      setUserName: jest.fn(),
      setUserAge: jest.fn(),
      onAgeBlur: jest.fn(),
      setUserHeight: jest.fn(),
      onHeightBlur: jest.fn(),
      setUserWeight: jest.fn(),
      onWeightBlur: jest.fn(),
      setGender: jest.fn(),
      onUnitChange: jest.fn(),
    },
    errors: {
      ageError: null,
      heightError: null,
      weightError: null,
    },
  }

  it('renders correctly with initial metric data', () => {
    render(<UserSettings profile={mockUserProfile} />)
    expect(screen.getByLabelText('Your Name')).toHaveValue('Test User')
    expect(screen.getByLabelText('Your Age')).toHaveValue(30)
    expect(screen.getByLabelText('Your Height (cm)')).toHaveValue(175)
    expect(screen.getByLabelText('Your Weight (kg)')).toHaveValue(70)
    expect(screen.getByLabelText('Male')).toBeChecked()
  })

  it('calls setUserName on name change', () => {
    render(<UserSettings profile={mockUserProfile} />)
    const nameInput = screen.getByLabelText('Your Name')
    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } })
    expect(mockUserProfile.handlers.setUserName).toHaveBeenCalledWith(
      'Jane Doe'
    )
  })

  it('calls setUserAge and onAgeBlur', () => {
    render(<UserSettings profile={mockUserProfile} />)
    const ageInput = screen.getByLabelText('Your Age')
    fireEvent.change(ageInput, { target: { value: '35' } })
    expect(mockUserProfile.handlers.setUserAge).toHaveBeenCalledWith('35')
    fireEvent.blur(ageInput)
    expect(mockUserProfile.handlers.onAgeBlur).toHaveBeenCalled()
  })

  it('displays age error when present', () => {
    const profileWithError = {
      ...mockUserProfile,
      errors: { ...mockUserProfile.errors, ageError: 'Invalid age' },
    }
    render(<UserSettings profile={profileWithError} />)
    expect(screen.getByText('Invalid age')).toBeInTheDocument()
  })

  it('renders imperial height fields when unit is imperial', () => {
    const imperialProfile = {
      ...mockUserProfile,
      data: {
        ...mockUserProfile.data,
        unitSystem: 'IMPERIAL' as const,
      },
    }
    render(<UserSettings profile={imperialProfile} />)
    expect(screen.getByLabelText('Feet')).toHaveValue(5)
    expect(screen.getByLabelText('Inches')).toHaveValue(9)
    expect(screen.getByLabelText('Your Weight (lbs)')).toBeInTheDocument()
  })

  it('calls setUserHeight and onHeightBlur for imperial fields', () => {
    const imperialProfile = {
      ...mockUserProfile,
      data: {
        ...mockUserProfile.data,
        unitSystem: 'IMPERIAL' as const,
      },
    }
    render(<UserSettings profile={imperialProfile} />)

    const feetInput = screen.getByLabelText('Feet')
    fireEvent.change(feetInput, { target: { value: '6' } })
    expect(mockUserProfile.handlers.setUserHeight).toHaveBeenCalledWith({
      feet: '6',
    })

    const inchesInput = screen.getByLabelText('Inches')
    fireEvent.change(inchesInput, { target: { value: '2' } })
    expect(mockUserProfile.handlers.setUserHeight).toHaveBeenCalledWith({
      inches: '2',
    })

    fireEvent.blur(feetInput)
    expect(mockUserProfile.handlers.onHeightBlur).toHaveBeenCalled()
  })

  it('calls onUnitChange when unit toggle is clicked', () => {
    render(<UserSettings profile={mockUserProfile} />)
    const imperialButton = screen.getByLabelText('imperial units')
    fireEvent.click(imperialButton)
    expect(mockUserProfile.handlers.onUnitChange).toHaveBeenCalledWith(
      'IMPERIAL'
    )
  })

  it('calls setGender when gender is changed', () => {
    render(<UserSettings profile={mockUserProfile} />)
    const femaleRadio = screen.getByLabelText('Female')
    fireEvent.click(femaleRadio)
    expect(mockUserProfile.handlers.setGender).toHaveBeenCalledWith('FEMALE')
  })
})
