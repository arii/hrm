// hooks/useTimer.ts
import { useAppState } from '@/context/AppStateContext';
import { useConnectionManager } from '@/context/ConnectionContext';
import { useCallback } from 'react';
import { TimerMode } from '@/types/websocket';

export const useTimer = () => {
  const { timerData } = useAppState();
  const { sendData } = useConnectionManager();

  const startTimer = useCallback(() => {
    sendData({ type: 'TIMER_COMMAND', command: 'START' });
  }, [sendData]);

  const pauseTimer = useCallback(() => {
    sendData({ type: 'TIMER_COMMAND', command: 'PAUSE' });
  }, [sendData]);

  const stopTimer = useCallback(() => {
    sendData({ type: 'TIMER_COMMAND', command: 'STOP' });
  }, [sendData]);

  const setTimerMode = useCallback(
    (mode: TimerMode) => {
      sendData({ type: 'SET_MODE', mode });
    },
    [sendData]
  );

  const setTimerConfig = useCallback(
    (workDuration: number, restDuration: number) => {
      sendData({ type: 'TIMER_CONFIG', workDuration, restDuration });
    },
    [sendData]
  );

  return {
    ...timerData,
    startTimer,
    pauseTimer,
    stopTimer,
    setTimerMode,
    setTimerConfig,
  };
};
