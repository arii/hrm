import {
  reducer,
  INITIAL_STATE,
  WebSocketState,
} from '../../context/webSocketReducer'
import { ServerMessage } from '../../types/websocket'
import { HrmStreamData as ServerHrmData } from '../../types/core'

describe('webSocketReducer', () => {
  it('should handle HRM_UPDATE by merging new data with existing state', () => {
    const initialState: WebSocketState = {
      ...INITIAL_STATE,
      hrmData: [
        {
          clientId: 'client-1',
          value: 120,
          percentage: 60,
          zone: 1,
          updatedAt: 1000,
          isConnected: true,
          lastUpdated: 1000,
          calories: 100,
        },
      ],
    }

    const payload: ServerHrmData[] = [
      {
        clientId: 'client-1',
        value: 125,
        percentage: 65,
        zone: 2,
        updatedAt: 2000,
        calories: 105,
      },
    ]

    const message: ServerMessage = {
      type: 'HRM_UPDATE',
      payload: payload,
    }

    const newState = reducer(initialState, message)

    expect(newState.hrmData).toHaveLength(1)
    expect(newState.hrmData[0]).toEqual(
      expect.objectContaining({
        clientId: 'client-1',
        value: 125,
        percentage: 65,
        zone: 2,
        updatedAt: 2000,
        isConnected: true,
      })
    )
    expect(newState.hrmData[0].lastUpdated).toBeGreaterThan(1000)
  })

  it('should handle HRM_UPDATE by adding new clients', () => {
    const initialState: WebSocketState = { ...INITIAL_STATE, hrmData: [] }

    const payload: ServerHrmData[] = [
      {
        clientId: 'client-2',
        value: 140,
        percentage: 75,
        zone: 3,
        updatedAt: 3000,
        calories: 50,
      },
    ]

    const message: ServerMessage = {
      type: 'HRM_UPDATE',
      payload: payload,
    }

    const newState = reducer(initialState, message)

    expect(newState.hrmData).toHaveLength(1)
    expect(newState.hrmData[0]).toEqual(
      expect.objectContaining({
        clientId: 'client-2',
        value: 140,
        isConnected: true,
      })
    )
  })

  it('should handle HRM_UPDATE by removing clients not present in the payload', () => {
    // The reducer logic:
    // const hrmData = payload.map((serverData) => ({ ... }))
    // This implies that if a client is NOT in the payload, it is NOT in the new state.
    // The payload is the source of truth for "active clients".

    const initialState: WebSocketState = {
      ...INITIAL_STATE,
      hrmData: [
        {
          clientId: 'client-toremove',
          value: 100,
          percentage: 50,
          zone: 1,
          updatedAt: 1000,
          isConnected: true,
          lastUpdated: 1000,
          calories: 100,
        },
      ],
    }

    const payload: ServerHrmData[] = [
      {
        clientId: 'client-new',
        value: 140,
        percentage: 75,
        zone: 3,
        updatedAt: 3000,
        calories: 50,
      },
    ]

    const message: ServerMessage = {
      type: 'HRM_UPDATE',
      payload: payload,
    }

    const newState = reducer(initialState, message)

    expect(newState.hrmData).toHaveLength(1)
    expect(newState.hrmData[0].clientId).toBe('client-new')
    expect(
      newState.hrmData.find((c) => c.clientId === 'client-toremove')
    ).toBeUndefined()
  })

  it('should preserve existing client state properties not present in payload if merging', () => {
    // NOTE: The current reducer implementation creates a NEW object from the payload:
    // const hrmData = payload.map((serverData) => ({
    //   ...(existingMap.get(serverData.clientId) || {}),
    //   ...serverData,
    //   ...
    // }))
    // So it SHOULD preserve extra properties from the existing state if the client ID matches.

    const initialState: WebSocketState = {
      ...INITIAL_STATE,
      hrmData: [
        {
          clientId: 'client-1',
          value: 120,
          percentage: 60,
          zone: 1,
          updatedAt: 1000,
          isConnected: true,
          lastUpdated: 1000,
          calories: 100,
          name: 'Existing Name', // Property to preserve
        },
      ],
    }

    const payload: ServerHrmData[] = [
      {
        clientId: 'client-1',
        value: 125,
        // Name is missing in payload
        percentage: 65,
        zone: 2,
        updatedAt: 2000,
        calories: 105,
      },
    ]

    const message: ServerMessage = {
      type: 'HRM_UPDATE',
      payload: payload,
    }

    const newState = reducer(initialState, message)

    expect(newState.hrmData[0].name).toBe('Existing Name')
    expect(newState.hrmData[0].value).toBe(125)
  })
})
