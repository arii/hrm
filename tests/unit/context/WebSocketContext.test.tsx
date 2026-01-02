import { reducer } from '../../../context/WebSocketContext'
import { INITIAL_STATE } from '../../../context/webSocketReducer'
import { ServerHrmData } from '../../../types/core'

describe('WebSocket reducer', () => {
  it('should handle HRM_UPDATE with a new user', () => {
    const initialState = {
      ...INITIAL_STATE,
      hrmData: [],
    }
    const payload: ServerHrmData[] = [
      {
        clientId: 'client1',
        name: 'User 1',
        value: 120,
        lastUpdated: Date.now(),
      },
    ]
    const action = {
      type: 'HRM_UPDATE' as const,
      payload,
    }
    const newState = reducer(initialState, action)
    expect(newState.hrmData).toHaveLength(1)
    expect(newState.hrmData[0]).toEqual({
      ...payload[0],
      isConnected: true,
    })
  })

  it('should handle HRM_UPDATE with multiple new users', () => {
    const initialState = {
      ...INITIAL_STATE,
      hrmData: [],
    }
    const payload: ServerHrmData[] = [
      {
        clientId: 'client1',
        name: 'User 1',
        value: 120,
        lastUpdated: Date.now(),
      },
      {
        clientId: 'client2',
        name: 'User 2',
        value: 130,
        lastUpdated: Date.now(),
      },
    ]
    const action = {
      type: 'HRM_UPDATE' as const,
      payload,
    }
    const newState = reducer(initialState, action)
    expect(newState.hrmData).toHaveLength(2)
    expect(newState.hrmData[0]).toEqual({
      ...payload[0],
      isConnected: true,
    })
    expect(newState.hrmData[1]).toEqual({
      ...payload[1],
      isConnected: true,
    })
  })

  it('should handle HRM_UPDATE with an existing user', () => {
    const now = Date.now()
    const initialState = {
      ...INITIAL_STATE,
      hrmData: [
        {
          clientId: 'client1',
          name: 'User 1',
          value: 120,
          lastUpdated: now - 1000,
          calories: 10,
          isConnected: true,
        },
      ],
    }
    const payload: ServerHrmData[] = [
      {
        clientId: 'client1',
        name: 'User 1',
        value: 125,
        lastUpdated: now,
      },
    ]
    const action = {
      type: 'HRM_UPDATE' as const,
      payload,
    }
    const newState = reducer(initialState, action)
    expect(newState.hrmData).toHaveLength(1)
    expect(newState.hrmData[0]).toEqual({
      ...initialState.hrmData[0],
      ...payload[0],
      isConnected: true,
    })
    expect(newState.hrmData[0].calories).toBe(10)
  })

  it('should handle HRM_UPDATE with a disconnected user', () => {
    const initialState = {
      ...INITIAL_STATE,
      hrmData: [
        {
          clientId: 'client1',
          name: 'User 1',
          value: 120,
          lastUpdated: Date.now() - 1000,
          isConnected: true,
        },
        {
          clientId: 'client2',
          name: 'User 2',
          value: 130,
          lastUpdated: Date.now() - 1000,
          isConnected: true,
        },
      ],
    }
    const payload: ServerHrmData[] = [
      {
        clientId: 'client1',
        name: 'User 1',
        value: 125,
        lastUpdated: Date.now(),
      },
    ]
    const action = {
      type: 'HRM_UPDATE' as const,
      payload,
    }
    const newState = reducer(initialState, action)
    expect(newState.hrmData).toHaveLength(1)
    expect(newState.hrmData[0].clientId).toBe('client1')
  })

  it('should handle HRM_UPDATE with a new user connecting while another is connected', () => {
    const now = Date.now()
    const initialState = {
      ...INITIAL_STATE,
      hrmData: [
        {
          clientId: 'client1',
          name: 'User 1',
          value: 120,
          lastUpdated: now - 1000,
          isConnected: true,
        },
      ],
    }
    const payload: ServerHrmData[] = [
      {
        clientId: 'client1',
        name: 'User 1',
        value: 125,
        lastUpdated: now,
      },
      {
        clientId: 'client2',
        name: 'User 2',
        value: 130,
        lastUpdated: now,
      },
    ]
    const action = {
      type: 'HRM_UPDATE' as const,
      payload,
    }
    const newState = reducer(initialState, action)
    expect(newState.hrmData).toHaveLength(2)
    expect(
      newState.hrmData.find((user) => user.clientId === 'client1')
    ).toBeDefined()
    expect(
      newState.hrmData.find((user) => user.clientId === 'client2')
    ).toBeDefined()
  })

  it('should handle HRM_UPDATE with an empty payload', () => {
    const initialState = {
      ...INITIAL_STATE,
      hrmData: [
        {
          clientId: 'client1',
          name: 'User 1',
          value: 120,
          lastUpdated: Date.now(),
          isConnected: true,
        },
      ],
    }
    const payload: ServerHrmData[] = []
    const action = {
      type: 'HRM_UPDATE' as const,
      payload,
    }
    const newState = reducer(initialState, action)
    expect(newState.hrmData).toHaveLength(0)
  })
})
