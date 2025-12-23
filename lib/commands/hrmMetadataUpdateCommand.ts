// lib/commands/hrmMetadataUpdateCommand.ts

import { WebSocket } from 'ws';
import { CommandHandler } from './command';
import { ClientCommandMessage, HrmMetadataUpdateMessage, ExtWebSocket } from '../../types/websocket';
import { HrmStreamData } from '../../types/core';

type HrmMetadataUpdateDependencies = {
    clientData: Map<string, HrmStreamData>;
    broadcastState: () => void;
};

export class HrmMetadataUpdateCommand implements CommandHandler {
    private clientData: Map<string, HrmStreamData>;
    private broadcastState: () => void;

    constructor({ clientData, broadcastState }: HrmMetadataUpdateDependencies) {
        this.clientData = clientData;
        this.broadcastState = broadcastState;
    }

    execute(ws: WebSocket, message: ClientCommandMessage): void {
        const extWs = ws as ExtWebSocket;
        const clientId = extWs.clientId;
        const metadataMessage = message as HrmMetadataUpdateMessage;

        const existingData = this.clientData.get(clientId);
        if (existingData) {
            const updateData: Partial<HrmStreamData> = Object.fromEntries(
                Object.entries(metadataMessage.data).filter(([_, value]) => value !== null)
            );
            this.clientData.set(clientId, { ...existingData, ...updateData });
        }
        this.broadcastState();
    }
}
