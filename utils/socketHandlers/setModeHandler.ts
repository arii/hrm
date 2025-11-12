// File: utils/socketHandlers/setModeHandler.ts
import { z } from "zod";
import { tabataServiceInstance } from "../socketManager";

const _TimerModeCommandMessageSchema = z.object({
  type: z.literal("SET_MODE"),
  mode: z.union([z.literal("STOPWATCH"), z.literal("TABATA")]),
});

type TimerModeCommandMessage = z.infer<typeof _TimerModeCommandMessageSchema>;

export const handleSetMode = (message: TimerModeCommandMessage) => {
  tabataServiceInstance?.setMode(message.mode);
};
