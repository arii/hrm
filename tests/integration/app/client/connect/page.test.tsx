/**
 * @jest-environment jsdom
 */
import { render, screen, act } from '@testing-library/react'
import ConnectPage from '@/app/client/connect/page'
import { UserSettingsProvider } from '@/context/UserSettingsContext'
import { WebSocketProvider } from '@/context/WebSocketContext'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'

// Mocks
jest.mock('@/hooks/useBluetoothHRM')
jest.mock('@/context/WebSocketContext')

describe('ConnectPage Integration', () => {
  const mockUseBluetoothHRM = useBluetoothHRM as jest.Mock
  const mockUseWebSocket = useWebSocket as jest.Mock
  let mockSendData: jest.Mock
  let onHeartRateUpdateCallback: (hr: number) => void

  beforeEach(() => {
    mockSendData = jest.fn()
    mockUseWebSocket.mockReturnValue({
      sendData: mockSendData,
      connectionStatus: 'Connected',
      hrmData: [],
    })
    mockUseBluetoothHRM.mockImplementation(({ onHeartRateUpdate }) => {
      onHeartRateUpdateCallback = onHeartRateUpdate
      return {
        connectAndStream: jest.fn(),
        disconnect: jest.fn(),
        deviceStatus: 'Connected',
        isConnected: true,
        isSupported: true,
      }
    })
  })

  it('should process heart rate updates, calculate calories, and send data to WebSocket', async () => {
    render(
      <UserSettingsProvider>
        <WebSocketProvider>
          <ConnectPage />
        </WebSocketProvider>
      </UserSettingsProvider>
    )

    // Start the workout
    act(() => {
      screen.getByRole('button', { name: /Start Workout/i }).click()
    })

    // Simulate heart rate updates
    act(() => {
      onHeartRateUpdateCallback(120)
    })
    act(() => {
      onHeartRateUpdateCallback(125)
    })

    // Fast-forward timers
    await act(async () => {
      jest.runAllTimers()
    })

    // Verify that sendData was called with the correct payload
    expect(mockSendData).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'HRM_INPUT',
        data: expect.objectContaining({
          value: 125,
          calories: expect.any(Number),
        }),
      })
    )
  })
})
