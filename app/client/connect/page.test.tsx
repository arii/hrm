/**
 * @jest-environment jsdom
 */
import { render } from '@testing-library/react'
import ConnectPage from './page'
import * as BluetoothHRMHook from '@/hooks/useBluetoothHRM'
import * as WebSocketContext from '@/context/WebSocketContext'
import { UserSettingsProvider } from '@/context/UserSettingsContext'

// Mock the BluetoothHRM hook
jest.mock('@/hooks/useBluetoothHRM')
// Mock the WebSocket context
jest.mock('@/context/WebSocketContext')

const mockAutoConnect = jest.fn()
const mockConnectAndStream = jest.fn()

describe('ConnectPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(BluetoothHRMHook, 'default').mockReturnValue({
      connectAndStream: mockConnectAndStream,
      autoConnect: mockAutoConnect,
      disconnect: jest.fn(),
      forgetDevice: jest.fn(),
      deviceStatus: 'Disconnected',
      batteryLevel: null,
      isConnected: false,
      isSupported: true,
      disconnectionReason: null,
    })
  })

  it('should call autoConnect on mount when WebSocket is connected', () => {
    jest.spyOn(WebSocketContext, 'useWebSocket').mockReturnValue({
      connectionStatus: 'Connected',
      sendData: jest.fn(),
      hrmData: [],
      timerData: {
        phase: 'idle',
        timeRemaining: 0,
        currentRound: 0,
        totalRounds: 0,
      },
      spotifyData: null,
      workoutData: {
        totalCalories: 0,
        workoutDuration: 0,
      },
      lastJsonMessage: null,
    })

    render(
      <UserSettingsProvider>
        <ConnectPage />
      </UserSettingsProvider>
    )

    expect(mockAutoConnect).toHaveBeenCalledTimes(1)
  })

  it('should not call autoConnect on mount when WebSocket is disconnected', () => {
    jest.spyOn(WebSocketContext, 'useWebSocket').mockReturnValue({
      connectionStatus: 'Disconnected',
      sendData: jest.fn(),
      hrmData: [],
      timerData: {
        phase: 'idle',
        timeRemaining: 0,
        currentRound: 0,
        totalRounds: 0,
      },
      spotifyData: null,
      workoutData: {
        totalCalories: 0,
        workoutDuration: 0,
      },
      lastJsonMessage: null,
    })

    render(
      <UserSettingsProvider>
        <ConnectPage />
      </UserSettingsProvider>
    )

    expect(mockAutoConnect).not.toHaveBeenCalled()
  })

  it('should not call autoConnect if already connected', () => {
    jest.spyOn(BluetoothHRMHook, 'default').mockReturnValue({
      connectAndStream: mockConnectAndStream,
      autoConnect: mockAutoConnect,
      disconnect: jest.fn(),
      forgetDevice: jest.fn(),
      deviceStatus: 'Connected',
      batteryLevel: null,
      isConnected: true,
      isSupported: true,
      disconnectionReason: null,
    })

    jest.spyOn(WebSocketContext, 'useWebSocket').mockReturnValue({
      connectionStatus: 'Connected',
      sendData: jest.fn(),
      hrmData: [],
      timerData: {
        phase: 'idle',
        timeRemaining: 0,
        currentRound: 0,
        totalRounds: 0,
      },
      spotifyData: null,
      workoutData: {
        totalCalories: 0,
        workoutDuration: 0,
      },
      lastJsonMessage: null,
    })

    render(
      <UserSettingsProvider>
        <ConnectPage />
      </UserSettingsProvider>
    )

    expect(mockAutoConnect).not.toHaveBeenCalled()
  })
})
