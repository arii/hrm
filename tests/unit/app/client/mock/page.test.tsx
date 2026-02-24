/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, act } from '@testing-library/react'
import MockPage from '@/app/client/mock/page'
import { useWebSocket } from '@/context/WebSocketContext'
import '@testing-library/jest-dom'

// Mock the WebSocket context
jest.mock('@/context/WebSocketContext', () => ({
  useWebSocket: jest.fn(),
}))

describe('app/client/mock/page', () => {
  let mockSendData: jest.Mock

  beforeEach(() => {
    mockSendData = jest.fn()
    ;(useWebSocket as jest.Mock).mockReturnValue({
      connectionStatus: 'Connected',
      sendData: mockSendData,
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders the mock streamer page with default values', () => {
    render(<MockPage />)
    expect(screen.getByText('HRM Mock Streamer')).toBeInTheDocument()
    expect(screen.getByLabelText('User Name')).toHaveValue('Mock User')
    expect(screen.getByLabelText('Age')).toHaveValue(30)
    expect(screen.getByLabelText('Current BPM')).toHaveValue(100)
    expect(screen.getByTestId('streaming-start-button')).toBeInTheDocument()
  })

  it('sends an HR packet when BPM is changed and not streaming', () => {
    jest.useFakeTimers()
    render(<MockPage />)

    // Advance time to trigger the debounce
    act(() => {
      jest.advanceTimersByTime(500)
    })

    // Metadata packet is sent on mount
    expect(mockSendData).toHaveBeenCalledTimes(1)
    expect(mockSendData).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'HRM_METADATA_UPDATE' })
    )

    const bpmInput = screen.getByLabelText('Current BPM')
    fireEvent.change(bpmInput, { target: { value: '125' } })

    // HR packet is sent on change
    expect(mockSendData).toHaveBeenCalledTimes(2)
    expect(mockSendData).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'HRM_INPUT',
        data: expect.objectContaining({ value: 125 }),
      })
    )
    jest.useRealTimers()
  })

  it('starts and stops streaming HR data', () => {
    jest.useFakeTimers()
    render(<MockPage />)

    // Advance time to trigger the debounce for initial metadata
    act(() => {
      jest.advanceTimersByTime(500)
    })

    const startButton = screen.getByTestId('streaming-start-button')
    fireEvent.click(startButton)

    // Check that streaming has started
    expect(screen.getByTestId('streaming-stop-button')).toBeInTheDocument()

    // It should send an initial HR packet immediately
    expect(mockSendData).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'HRM_INPUT',
        data: expect.objectContaining({ value: 100 }),
      })
    )

    // Advance time to trigger the interval
    act(() => {
      jest.advanceTimersByTime(2000)
    })

    // The mock implementation fluctuates the HR, so we check that it was called again
    // The exact value is random, so we just check the type
    expect(mockSendData).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'HRM_INPUT',
      })
    )

    // Check total calls: metadata on mount + initial HR + interval HR
    expect(mockSendData).toHaveBeenCalledTimes(3)

    const stopButton = screen.getByTestId('streaming-stop-button')
    fireEvent.click(stopButton)

    // Check that streaming has stopped
    expect(screen.getByTestId('streaming-start-button')).toBeInTheDocument()

    // Advance time again to ensure no more packets are sent
    act(() => {
      jest.advanceTimersByTime(2000)
    })
    expect(mockSendData).toHaveBeenCalledTimes(3) // No new calls

    jest.useRealTimers()
  })
})
