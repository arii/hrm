
export const mockUseWebSocket = jest.fn();

jest.mock('@/context/WebSocketContext', () => ({
    useWebSocket: mockUseWebSocket,
}));
