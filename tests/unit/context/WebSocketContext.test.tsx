// tests/unit/context/WebSocketContext.test.tsx
import { reducer, INITIAL_STATE } from '@/context/webSocketReducer';
import { HrmData, ServerMessage } from '@/types/websocket';

describe('WebSocketContext Reducer', () => {
  it('should calculate avgHr and maxHr correctly on HRM_UPDATE', () => {
    let state = INITIAL_STATE;
    const hrmData1: HrmData[] = [{ clientId: 'user1', value: 100, maxHr: 200 }];
    const message1: ServerMessage = { type: 'HRM_UPDATE', payload: hrmData1 };
    state = reducer(state, message1);
    expect(state.hrmSessionStats['user1'].avgHr).toBe(100);
    expect(state.hrmSessionStats['user1'].maxHr).toBe(100);

    const hrmData2: HrmData[] = [{ clientId: 'user1', value: 120, maxHr: 200 }];
    const message2: ServerMessage = { type: 'HRM_UPDATE', payload: hrmData2 };
    state = reducer(state, message2);
    expect(state.hrmSessionStats['user1'].avgHr).toBe(110);
    expect(state.hrmSessionStats['user1'].maxHr).toBe(120);
  });

  it('should manage hrmDataHistory correctly', () => {
    let state = INITIAL_STATE;
    for (let i = 0; i < 70; i++) {
        const hrmData: HrmData[] = [{ clientId: 'user1', value: 100 + i, maxHr: 200 }];
        const message: ServerMessage = { type: 'HRM_UPDATE', payload: hrmData };
        state = reducer(state, message);
    }
    expect(state.hrmDataHistory['user1'].length).toBe(60);
    expect(state.hrmDataHistory['user1'][0].value).toBe(110);
  });

  it('should reset hrmDataHistory and hrmSessionStats on INITIAL_STATE', () => {
    let state = INITIAL_STATE;
    const hrmData: HrmData[] = [{ clientId: 'user1', value: 100, maxHr: 200 }];
    const message: ServerMessage = { type: 'HRM_UPDATE', payload: hrmData };
    state = reducer(state, message);

    expect(state.hrmSessionStats['user1']).toBeDefined();
    expect(state.hrmDataHistory['user1']).toBeDefined();

    const initialMessage: ServerMessage = { type: 'INITIAL_STATE', payload: { hrmData: [], timerData: {}, spotifyData: {} } };
    state = reducer(state, initialMessage);

    expect(state.hrmSessionStats['user1']).toBeUndefined();
    expect(state.hrmDataHistory['user1']).toBeUndefined();
  });
});
