/**
 * @jest-environment jsdom
 */
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react'
import UserSettings from '../../../../../app/client/connect/UserSettings'
import React, { Dispatch, SetStateAction } from 'react'

const mockLocalStorageStore: { [key: string]: string } = {}
const mockLocalStorageSetters: {
  [key: string]: Dispatch<SetStateAction<string>>[]
} = {}

jest.mock('@/hooks/useLocalStorage', () => ({
  __esModule: true,
  default: jest.fn(
    (key: string, initialValue: string): [string, (value: string) => void] => {
      const [value, setValue] = React.useState(() =>
        mockLocalStorageStore[key] !== undefined
          ? mockLocalStorageStore[key]
          : initialValue
      )

      if (!mockLocalStorageSetters[key]) {
        mockLocalStorageSetters[key] = []
      }
      if (!mockLocalStorageSetters[key].includes(setValue)) {
        mockLocalStorageSetters[key].push(setValue)
      }

      const set = (newValue: string) => {
        mockLocalStorageStore[key] = newValue
        mockLocalStorageSetters[key].forEach((setter) => setter(newValue))
      }

      return [value, set]
    }
  ),
}))

describe('UserSettings Logic', () => {
  const defaultProps = {
    userName: 'Test User',
    setUserName: jest.fn(),
    userAge: '30',
    setUserAge: jest.fn(),
    weightInKg: '70',
    setWeightInKg: jest.fn(),
  }

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
    for (const key in mockLocalStorageStore) {
      delete mockLocalStorageStore[key]
    }
    for (const key in mockLocalStorageSetters) {
      delete mockLocalStorageSetters[key]
    }
  })

  it('shows error for invalid age input (too high)', async () => {
    render(<UserSettings {...defaultProps} userAge="150" />)
    const ageInput = screen.getByLabelText('Your Age')

    act(() => {
      fireEvent.blur(ageInput)
    })

    await waitFor(() => {
      expect(
        screen.getByText('Please enter a valid age (1-120)')
      ).toBeInTheDocument()
    })
  })

  it('shows error for invalid age input (too low)', async () => {
    render(<UserSettings {...defaultProps} userAge="0" />)
    const ageInput = screen.getByLabelText('Your Age')
    act(() => {
      fireEvent.blur(ageInput)
    })
    await waitFor(() => {
      expect(
        screen.getByText('Please enter a valid age (1-120)')
      ).toBeInTheDocument()
    })
  })

  it('correctly converts imperial weight (lbs) to kg on blur', async () => {
    render(<UserSettings {...defaultProps} />)
    const weightInput = screen.getByLabelText(/Your Weight \(lbs\)/i)

    act(() => {
      fireEvent.change(weightInput, { target: { value: '154' } })
      fireEvent.blur(weightInput)
    })

    await waitFor(() => {
      expect(defaultProps.setWeightInKg).toHaveBeenCalledWith('69.85')
    })
  })

  it('shows an error for an invalid weight in lbs', async () => {
    render(<UserSettings {...defaultProps} />)
    const weightInput = screen.getByLabelText(/Your Weight \(lbs\)/i)

    act(() => {
      fireEvent.change(weightInput, { target: { value: '9999' } })
      fireEvent.blur(weightInput)
    })

    await waitFor(() => {
      expect(
        screen.getByText('Please enter a valid weight (66-440)')
      ).toBeInTheDocument()
    })
  })

  it('switches to metric and validates metric weight correctly', async () => {
    render(<UserSettings {...defaultProps} />)

    act(() => {
      fireEvent.click(screen.getByText('Metric (kg, cm)'))
    })

    await waitFor(async () => {
      const weightInput = await screen.findByLabelText(/Your Weight \(kg\)/i)
      expect(weightInput).toBeInTheDocument()

      act(() => {
        fireEvent.change(weightInput, { target: { value: '70' } })
        fireEvent.blur(weightInput)
      })
    })

    await waitFor(() => {
      expect(defaultProps.setWeightInKg).toHaveBeenCalledWith('70.00')
    })
  })
})
