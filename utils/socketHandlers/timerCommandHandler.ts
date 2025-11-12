// File: utils/socketHandlers/timerCommandHandler.ts
import { z } from "zod";
import { tabataServiceInstance } from "../socketManager";

const _TimerCommandMessageSchema = z.object({
  type: z.literal("TIMER_COMMAND"),
  command: z.union([z.literal("START"), z.literal("PAUSE"), z.literal("STOP")]),
});

type TimerCommandMessage = z.infer<typeof _TimerCommandMessageSchema>;

export const handleTimerCommand = (message: TimerCommandMessage) => {
  tabataServiceInstance?.handleCommand(message.command);
};
