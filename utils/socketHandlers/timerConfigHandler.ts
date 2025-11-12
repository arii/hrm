// File: utils/socketHandlers/timerConfigHandler.ts
import { z } from "zod";
import { tabataServiceInstance } from "../socketManager";

const _TimerConfigMessageSchema = z.object({
  type: z.literal("TIMER_CONFIG"),
  workDuration: z.number().min(1),
  restDuration: z.number().min(0),
  totalCycles: z.number().min(1).optional(),
});

type TimerConfigMessage = z.infer<typeof _TimerConfigMessageSchema>;

export const handleTimerConfig = (message: TimerConfigMessage) => {
  tabataServiceInstance?.setConfig({
    workDuration: message.workDuration,
    restDuration: message.restDuration,
    totalCycles: message.totalCycles,
  });
};
