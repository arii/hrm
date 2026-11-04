export const mockUseHrmData = jest.fn()
export const mockUseActiveAlerts = jest.fn()
export const mockUseWebSocketConnection = jest.fn()

jest.mock('@/context/WebSocketContext', () => ({
  useHrmData: mockUseHrmData,
  useActiveAlerts: mockUseActiveAlerts,
  useWebSocketConnection: mockUseWebSocketConnection,
}))
