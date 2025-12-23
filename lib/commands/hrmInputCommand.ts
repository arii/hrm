// lib/commands/hrmInputCommand.ts

import { WebSocket } from 'ws';
import { CommandHandler } from './command';
import { ClientCommandMessage, HrmInputMessage, ExtWebSocket } from '../../types/websocket';
import { HrmStreamData } from '../../types/core';
import { estimateCaloriesBurned } from '../../lib/calorie-estimation';
import { CALORIE_DEFAULTS } from '../../utils/constants';

// Dependencies that will be injected
type HrmDependencies = {
    clientData: Map<string, HrmStreamData>;
    clientSessionState: Map<string, { lastUpdate: number; accumulatedCalories: number }>;
    broadcastState: () => void;
};

export class HrmInputCommand implements CommandHandler {
    private clientData: Map<string, HrmStreamData>;
    private clientSessionState: Map<string, { lastUpdate: number; accumulatedCalories: number }>;
    private broadcastState: () => void;

    constructor({ clientData, clientSessionState, broadcastState }: HrmDependencies) {
        this.clientData = clientData;
        this.clientSessionState = clientSessionState;
        this.broadcastState = broadcastState;
    }

    execute(ws: WebSocket, message: ClientCommandMessage): void {
        const extWs = ws as ExtWebSocket;
        const clientId = extWs.clientId;
        const hrmMessage = message as HrmInputMessage;

        const existingData = this.clientData.get(clientId);
        const sessionState = this.clientSessionState.get(clientId);

        if (existingData && sessionState) {
            const now = Date.now();
            const dtMinutes = (now - sessionState.lastUpdate) / 1000 / 60;
            sessionState.lastUpdate = now;

            let currentAccumulated = sessionState.accumulatedCalories;
            const currentHr = hrmMessage.data.value ?? existingData.value;
            const currentAge = existingData.age ?? 30;

            if (currentHr > 30 && dtMinutes > 0 && dtMinutes < 5) {
                const caloriesBurned = estimateCaloriesBurned({
                    heartRate: currentHr,
                    age: currentAge,
                    weightKg: CALORIE_DEFAULTS.WEIGHT_KG,
                    durationMinutes: dtMinutes,
                });
                currentAccumulated += caloriesBurned;
            }

            sessionState.accumulatedCalories = currentAccumulated;

            this.clientData.set(clientId, {
                ...existingData,
                value: hrmMessage.data.value ?? existingData.value,
                calories: Math.round(currentAccumulated * 10) / 10,
            });
        }
        this.broadcastState();
    }
}
