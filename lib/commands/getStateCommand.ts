// lib/commands/getStateCommand.ts

import { WebSocket } from 'ws';
import { CommandHandler } from './command';
import { ClientCommandMessage, InitialStateSnapshotPayload, ServerMessage, StateSnapshot } from '../../types/websocket';
import { HrmStreamData } from '../../types/core';
import { sendWebSocketMessage } from '../../utils/websocketUtils';

type GetStateDependencies = {
    getUnifiedStateSnapshot: () => StateSnapshot;
    clientData: Map<string, HrmStreamData>;
};

export class GetStateCommand implements CommandHandler {
    private getUnifiedStateSnapshot: () => StateSnapshot;
    private clientData: Map<string, HrmStreamData>;

    constructor({ getUnifiedStateSnapshot, clientData }: GetStateDependencies) {
        this.getUnifiedStateSnapshot = getUnifiedStateSnapshot;
        this.clientData = clientData;
    }

    execute(ws: WebSocket, _message: ClientCommandMessage): void {
        const stateSnapshot = this.getUnifiedStateSnapshot();
        const payload: InitialStateSnapshotPayload = {
            ...stateSnapshot,
            hrmData: Array.from(this.clientData.values()),
        };
        const initialStateMessage: ServerMessage = {
            type: 'INITIAL_STATE',
            payload: payload,
        };
        sendWebSocketMessage(ws, initialStateMessage, 'socketManager.GET_STATE');
    }
}
