import { renderHook, act } from '@testing-library/react'
import useWebSocket from '../../../hooks/useWebSocket'

// Mock WebSocket
const mockWebSocket = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
  readyState: WebSocket.OPEN,
}

// Mock the global WebSocket
global.WebSocket = jest.fn(() => mockWebSocket) as any

describe('useWebSocket Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('initializes with default state', () => {
    const { result } = renderHook(() => useWebSocket())
    
    expect(result.current.connectionStatus).toBe('Connecting')
    expect(result.current.isConnected).toBe(false)
    expect(result.current.lastMessage).toBeNull()
  })

  test('establishes connection', () => {
    const { result } = renderHook(() => useWebSocket())
    
    // Simulate connection open
    act(() => {
      const onOpen = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'open'
      )?.[1]
      onOpen?.()
    })
    
    expect(result.current.connectionStatus).toBe('Connected')
    expect(result.current.isConnected).toBe(true)
  })

  test('handles incoming messages', () => {
    const { result } = renderHook(() => useWebSocket())
    
    const testMessage = {
      type: 'HRM_UPDATE',
      data: { value: 75, timestamp: Date.now() }
    }
    
    act(() => {
      const onMessage = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )?.[1]
      onMessage?.({ data: JSON.stringify(testMessage) })
    })
    
    expect(result.current.lastMessage).toEqual(testMessage)
    expect(result.current.currentUserData).toEqual(testMessage.data)
  })

  test('handles timer state updates', () => {
    const { result } = renderHook(() => useWebSocket())
    
    const timerMessage = {
      type: 'TIMER_UPDATE',
      data: {
        isRunning: true,
        currentPhase: 'WORK',
        timeRemaining: 30
      }
    }
    
    act(() => {
      const onMessage = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )?.[1]
      onMessage?.({ data: JSON.stringify(timerMessage) })
    })
    
    expect(result.current.timerState.isRunning).toBe(true)
    expect(result.current.timerState.currentPhase).toBe('WORK')
    expect(result.current.timerState.timeRemaining).toBe(30)
  })

  test('handles spotify state updates', () => {
    const { result } = renderHook(() => useWebSocket())
    
    const spotifyMessage = {
      type: 'SPOTIFY_UPDATE',
      data: {
        isPlaying: true,
        trackName: 'Test Song',
        artistName: 'Test Artist'
      }
    }
    
    act(() => {
      const onMessage = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )?.[1]
      onMessage?.({ data: JSON.stringify(spotifyMessage) })
    })
    
    expect(result.current.spotifyData.isPlaying).toBe(true)
    expect(result.current.spotifyData.trackName).toBe('Test Song')
    expect(result.current.spotifyData.artistName).toBe('Test Artist')
  })

  test('sends messages correctly', () => {
    const { result } = renderHook(() => useWebSocket())
    
    const testMessage = { type: 'TIMER_COMMAND', command: 'START' }
    
    act(() => {
      result.current.sendMessage(testMessage)
    })
    
    expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(testMessage))
  })

  test('handles connection errors', () => {
    const { result } = renderHook(() => useWebSocket())
    
    act(() => {
      const onError = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )?.[1]
      onError?.()
    })
    
    expect(result.current.connectionStatus).toBe('Error')
    expect(result.current.isConnected).toBe(false)
  })

  test('handles connection close', () => {
    const { result } = renderHook(() => useWebSocket())
    
    act(() => {
      const onClose = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'close'
      )?.[1]
      onClose?.()
    })
    
    expect(result.current.connectionStatus).toBe('Disconnected')
    expect(result.current.isConnected).toBe(false)
  })
})
