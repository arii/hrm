/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ConnectView, {
  getConnectionBanner,
} from '@/app/client/connect/ConnectView'
import '@testing-library/jest-dom'
import { UserProfileState } from '@/types/connect'

describe('ConnectView', () => {
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

  const mockProps = {
    duration: '00:00',
    caloriesBurned: 0,
    userProfile: mockUserProfile,
    isConnected: false,
    deviceStatus: 'Disconnected',
    batteryLevel: null,
    onConnect: jest.fn(),
    onDisconnect: jest.fn(),
    onForgetDevice: jest.fn().mockResolvedValue(undefined),
    isSupported: true,
    currentHR: 0,
    hrZoneData: { percentage: 0, zone: 'ZONE_0' as const },
    connectionStatus: 'Connected',
    bluetoothConnected: false,
    hasStarted: false,
    onReset: jest.fn(),
    workoutStatus: 'idle' as const,
    onStartWorkout: jest.fn(),
    onEndWorkout: jest.fn(),
    onPauseWorkout: jest.fn(),
    signalPeriodMs: 1000,
  }

  it('renders the reset button when bluetooth is not supported', () => {
    render(<ConnectView {...mockProps} isSupported={false} />)
    const resetButton = screen.getByRole('button', {
      name: /Reset Permissions & Settings/i,
    })
    expect(resetButton).toBeInTheDocument()
  })

  it('renders the reset button as enabled by default', () => {
    render(<ConnectView {...mockProps} />)
    const resetButton = screen.getByRole('button', {
      name: /Reset Permissions & Settings/i,
    })
    expect(resetButton).toBeEnabled()
  })

  it('calls onForgetDevice and onReset when the reset button is clicked', async () => {
    render(<ConnectView {...mockProps} />)
    const resetButton = screen.getByRole('button', {
      name: /Reset Permissions & Settings/i,
    })
    fireEvent.click(resetButton)

    await waitFor(() => {
      expect(mockProps.onForgetDevice).toHaveBeenCalled()
      expect(mockProps.onReset).toHaveBeenCalled()
    })
  })

  it('displays an error message for invalid age only when ageError is set', () => {
    const { rerender } = render(<ConnectView {...mockProps} />)
    expect(screen.queryByText('Invalid age')).not.toBeInTheDocument()

    const propsWithAgeError = {
      ...mockProps,
      userProfile: {
        ...mockUserProfile,
        errors: { ...mockUserProfile.errors, ageError: 'Invalid age' },
      },
    }
    rerender(<ConnectView {...propsWithAgeError} />)
    expect(screen.getByText('Invalid age')).toBeInTheDocument()
  })

  it('displays an error message for invalid height only when heightError is set', () => {
    const { rerender } = render(<ConnectView {...mockProps} />)
    expect(screen.queryByText('Invalid height')).not.toBeInTheDocument()

    const propsWithHeightError = {
      ...mockProps,
      userProfile: {
        ...mockUserProfile,
        errors: { ...mockUserProfile.errors, heightError: 'Invalid height' },
      },
    }
    rerender(<ConnectView {...propsWithHeightError} />)
    expect(screen.getByText('Invalid height')).toBeInTheDocument()
  })

  it('displays an error message for invalid weight only when weightError is set', () => {
    const { rerender } = render(<ConnectView {...mockProps} />)
    expect(screen.queryByText('Invalid weight')).not.toBeInTheDocument()

    const propsWithWeightError = {
      ...mockProps,
      userProfile: {
        ...mockUserProfile,
        errors: { ...mockUserProfile.errors, weightError: 'Invalid weight' },
      },
    }
    rerender(<ConnectView {...propsWithWeightError} />)
    expect(screen.getByText('Invalid weight')).toBeInTheDocument()
  })

  it('hydrates without errors when server lacks bluetooth but client supports it', async () => {
    const { renderToString } = await import('react-dom/server')
    const { hydrateRoot } = await import('react-dom/client')
    const { act } = await import('react')
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    // Server: navigator.bluetooth is undefined, so isSupported is false
    const html = renderToString(
      <ConnectView {...mockProps} isSupported={false} />
    )
    const container = document.createElement('div')
    container.innerHTML = html

    // Client: bluetooth exists, so isSupported flips to true on hydrate
    await act(async () => {
      hydrateRoot(container, <ConnectView {...mockProps} isSupported={true} />)
    })

    const hydrationErrors = consoleSpy.mock.calls.filter((args) =>
      String(args[0]).match(/hydration|Hydration/)
    )
    expect(hydrationErrors).toHaveLength(0)
    consoleSpy.mockRestore()
  })

  describe('status banner mutual exclusion', () => {
    const banners = () => screen.queryAllByTestId('connection-status-alert')

    it('shows nothing when idle and disconnected', () => {
      render(<ConnectView {...mockProps} />)
      expect(banners()).toHaveLength(0)
    })

    it('shows progress info while connecting', () => {
      render(<ConnectView {...mockProps} deviceStatus="Connecting..." />)
      const [banner] = banners()
      expect(banners()).toHaveLength(1)
      // (The Connect button shows its own "Connecting..." label.)
      expect(banner).toHaveTextContent('Connecting...')
    })

    it('shows success when streaming', () => {
      render(
        <ConnectView
          {...mockProps}
          isConnected={true}
          bluetoothConnected={true}
        />
      )
      expect(banners()).toHaveLength(1)
      expect(
        screen.getByText('Connected! Heart rate data is being streamed.')
      ).toBeInTheDocument()
    })

    it('shows the paused warning after a mid-workout disconnect', () => {
      render(
        <ConnectView
          {...mockProps}
          hasStarted={true}
          deviceStatus="Disconnected"
        />
      )
      expect(banners()).toHaveLength(1)
      expect(
        screen.getByText('Device Disconnected - Workout Paused')
      ).toBeInTheDocument()
    })

    it('prefers the named failure over the paused warning', () => {
      render(
        <ConnectView
          {...mockProps}
          hasStarted={true}
          deviceStatus="Failed: Connection failed. Device might be too far."
        />
      )
      expect(banners()).toHaveLength(1)
      expect(
        screen.getByText('Failed: Connection failed. Device might be too far.')
      ).toBeInTheDocument()
      expect(
        screen.queryByText('Device Disconnected - Workout Paused')
      ).not.toBeInTheDocument()
    })
  })
})

describe('getConnectionBanner', () => {
  const base = {
    deviceStatus: 'Disconnected',
    isConnected: false,
    hasStarted: false,
    bluetoothConnected: false,
  }

  it.each([
    [{ ...base, deviceStatus: 'Failed: timeout' }, 'error'],
    [
      {
        ...base,
        hasStarted: true,
        deviceStatus: 'Failed: timeout',
      },
      'error',
    ],
    [{ ...base, hasStarted: true }, 'warning'],
    [
      {
        ...base,
        isConnected: true,
        bluetoothConnected: true,
        deviceStatus: 'Connected',
      },
      'success',
    ],
    [{ ...base, deviceStatus: 'Connecting...' }, 'info'],
    [base, null],
    [{ ...base, deviceStatus: '' }, null],
  ])('resolves %p to %p', (args, expectedSeverity) => {
    const banner = getConnectionBanner(args)
    if (expectedSeverity === null) {
      expect(banner).toBeNull()
    } else {
      expect(banner?.severity).toBe(expectedSeverity)
    }
  })

  it('carries the device status text on failure and info', () => {
    expect(
      getConnectionBanner({ ...base, deviceStatus: 'Failed: busy' })?.text
    ).toBe('Failed: busy')
    expect(
      getConnectionBanner({ ...base, deviceStatus: 'Scanning...' })?.text
    ).toBe('Scanning...')
  })
})
