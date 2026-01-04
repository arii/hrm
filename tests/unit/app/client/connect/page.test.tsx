/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ConnectPage from '@/app/client/connect/page'
import {
  UserSettingsContext,
  UserPreferences,
} from '@/context/UserSettingsContext'
import { WebSocketProvider } from '@/context/WebSocketContext'
import { toDisplay } from '@/utils/units'

// Correctly mock the hooks
jest.mock('@/hooks/useBluetoothHRM', () => jest.fn(() => ({
  connectAndStream: jest.fn(),
  autoConnect: jest.fn(),
  disconnect: jest.fn(),
  forgetDevice: jest.fn(),
  deviceStatus: 'disconnected',
  batteryLevel: null,
  isConnected: false,
  isDataStale: false,
  isSupported: true,
  disconnectionReason: null,
})));

jest.mock('@/hooks/useWorkoutSession', () => ({
  __esModule: true,
  useWorkoutSession: jest.fn(() => ({
    workoutDuration: 0,
    resetWorkout: jest.fn(),
    hasStarted: false,
    startWorkout: jest.fn(),
    pauseWorkout: jest.fn(),
    endWorkout: jest.fn(),
    workoutStatus: 'idle',
  })),
}));

jest.mock('@/context/WebSocketContext', () => ({
  useWebSocket: () => ({
    connectionStatus: 'Connected',
    sendData: jest.fn(),
  }),
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

const mockUserSettings: UserPreferences = {
  theme: 'dark',
  volumeLevel: 70,
  defaultWorkDuration: 20,
  defaultRestDuration: 10,
  favoritePlaylist: '',
  userName: 'Test User',
  userAge: 30,
  userWeight: 70, // in kg
  autoConnect: false,
  gender: 'MALE',
  unitSystem: 'METRIC',
};

const renderWithProviders = (
  ui: React.ReactElement,
  {
    providerProps,
  }: { providerProps: { value: [UserPreferences, (value: any) => void] } }
) => {
  return render(
    <WebSocketProvider>
      <UserSettingsContext.Provider {...providerProps}>
        {ui}
      </UserSettingsContext.Provider>
    </WebSocketProvider>
  );
};

describe('ConnectPage', () => {
  let providerProps: { value: [UserPreferences, (value: any) => void] };
  let setUserSettings: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    setUserSettings = jest.fn();
    providerProps = {
      value: [mockUserSettings, setUserSettings],
    };
    // Suppress console.error output from React related to act warnings if any
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('displays the initial weight correctly based on the unit system', () => {
    renderWithProviders(<ConnectPage />, { providerProps });
    const weightInput = screen.getByLabelText(/Your Weight/);
    expect(weightInput).toHaveValue(
      toDisplay(mockUserSettings.userWeight!, mockUserSettings.unitSystem)
    );
  });

  it('updates the userWeight in context on blur', () => {
    renderWithProviders(<ConnectPage />, { providerProps });
    const weightInput = screen.getByLabelText(/Your Weight/);

    fireEvent.change(weightInput, { target: { value: '75' } });
    fireEvent.blur(weightInput);

    expect(setUserSettings).toHaveBeenCalledWith(expect.any(Function));

    const updater = setUserSettings.mock.calls[0][0];
    const newSettings = updater(mockUserSettings);
    expect(newSettings.userWeight).toBe(75);
  });

  it('converts and displays the weight correctly when the unit system changes', () => {
    const { rerender } = renderWithProviders(<ConnectPage />, { providerProps });

    let weightInput = screen.getByLabelText(/Your Weight/);
    expect(weightInput).toHaveValue(70);

    // Simulate user clicking the imperial button
    const imperialButton = screen.getByRole('button', { name: 'imperial' });
    fireEvent.click(imperialButton);

    // Check that setUserSettings was called to update the unit system
    expect(setUserSettings).toHaveBeenCalled();
    const updater = setUserSettings.mock.calls[0][0];
    const newSettings = updater(mockUserSettings);
    expect(newSettings.unitSystem).toBe('IMPERIAL');

    // Rerender with the new settings to see the updated display value
    const newProviderProps = {
      value: [newSettings, setUserSettings] as [UserPreferences, (value: any) => void],
    };

    rerender(
      <WebSocketProvider>
        <UserSettingsContext.Provider {...newProviderProps}>
          <ConnectPage />
        </UserSettingsContext.Provider>
      </WebSocketProvider>
    );

    weightInput = screen.getByLabelText(/Your Weight/);
    const weightInLbs = toDisplay(mockUserSettings.userWeight!, 'IMPERIAL');
    expect(weightInput).toHaveValue(weightInLbs);
  });
});
