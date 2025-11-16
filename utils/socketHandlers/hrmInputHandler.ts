// File: utils/socketHandlers/hrmInputHandler.ts
import { WebSocket } from "ws";
import { z } from "zod";
import { clientData, broadcastState } from "../socketManager";

const HrmInputDataSchema = z.object({
  value: z.number().optional(),
  maxHr: z.number().optional(),
  name: z.string().optional(),
  age: z.number().optional(),
});

const HrmInputMessageSchema = z.object({
  type: z.literal("HRM_INPUT"),
  data: HrmInputDataSchema,
});

type HrmInputMessage = z.infer<typeof HrmInputMessageSchema>;

export const handleHrmInput = (ws: WebSocket, message: HrmInputMessage) => {
  const userData = clientData.get(ws);
  if (!userData) return;

  userData.hrmData = { ...userData.hrmData, ...message.data };
  broadcastState();
};
