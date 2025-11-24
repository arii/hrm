import { TimerState } from "../../types/websocket";

describe("WebSocket Types", () => {
  it("TimerState should have required properties", () => {
    const mockTimerState: TimerState = {
      isRunning: false,
      timeRemaining: 25 * 60,
      totalTime: 25 * 60,
      currentPhase: "work",
      round: 1,
      totalRounds: 4,
    };

    expect(mockTimerState).toHaveProperty("isRunning");
    expect(mockTimerState).toHaveProperty("timeRemaining");
    expect(mockTimerState).toHaveProperty("currentPhase");
    expect(mockTimerState.currentPhase).toBe("work");
  });
});

