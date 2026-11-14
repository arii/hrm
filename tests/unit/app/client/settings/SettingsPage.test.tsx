/**
 * @jest-environment jsdom
 */
import SettingsPage from '@/app/client/settings/page'
import { useConnectUserProfile } from '@/hooks/useConnectUserProfile'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { UserProfileState } from '@/types/connect'

jest.mock('@/hooks/useConnectUserProfile')

const theme = createTheme()

describe('SettingsPage', () => {
  const mockHandlers = {
    setUserName: jest.fn(),
    setUserAge: jest.fn(),
    onAgeBlur: jest.fn(),
    setUserHeight: jest.fn(),
    onHeightBlur: jest.fn(),
    setUserWeight: jest.fn(),
    onWeightBlur: jest.fn(),
    setGender: jest.fn(),
    onUnitChange: jest.fn(),
  }

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
    handlers: mockHandlers,
    errors: {
      ageError: null,
      heightError: null,
      weightError: null,
    },
  }

  const renderPage = () =>
    render(
      <ThemeProvider theme={theme}>
        <SettingsPage />
      </ThemeProvider>
    )

  it('renders the profile settings surface', () => {
    ;(useConnectUserProfile as jest.Mock).mockReturnValue(mockUserProfile)
    renderPage()

    expect(
      screen.getByRole('heading', { name: 'Profile Settings' })
    ).toBeInTheDocument()
    expect(screen.getByTestId('user-settings-form')).toBeInTheDocument()
  })

  it('exposes the profile fields for editing (OQ-2a: profile only)', () => {
    ;(useConnectUserProfile as jest.Mock).mockReturnValue(mockUserProfile)
    renderPage()

    expect(screen.getByLabelText('Your Name')).toHaveValue('Test User')
    expect(screen.getByLabelText('Your Age')).toHaveValue(30)
    expect(screen.getByLabelText('Your Height (cm)')).toHaveValue(175)
    expect(screen.getByLabelText('Your Weight (kg)')).toHaveValue(70)
  })

  it('routes name edits through the shared profile hook', () => {
    ;(useConnectUserProfile as jest.Mock).mockReturnValue(mockUserProfile)
    renderPage()

    fireEvent.change(screen.getByLabelText('Your Name'), {
      target: { value: 'Ariel' },
    })
    expect(mockHandlers.setUserName).toHaveBeenCalledWith('Ariel')
  })
})
