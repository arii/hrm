/**
 * @file useSignalQuality.ts
 * @description A React hook to assess the quality of a data stream by analyzing the period between data packets.
 * It calculates a rolling average of the packet arrival time and can proactively update this
 * period if packets are missed.
 */
import { useState, useRef, useEffect, useCallback } from 'react';

// Constants for signal quality calculation
const ROLLING_AVG_HISTORY_LENGTH = 5;
const MISSED_PACKET_THRESHOLD_BUFFER_MS = 500;
const MIN_MISSED_PACKET_THRESHOLD_MS = 1500;
const HEARTBEAT_INTERVAL_MS = 1000;

interface UseSignalQualityProps {
  /**
   * @property {number} lastDataTimestamp - The timestamp of the last received data packet. Should be 0 if no data has been received yet.
   */
  lastDataTimestamp: number;
  /**
   * @property {boolean} [isEnabled=true] - A flag to enable or disable the signal quality check.
   */
  isEnabled?: boolean;
}

export const useSignalQuality = ({
  lastDataTimestamp,
  isEnabled = true,
}: UseSignalQualityProps) => {
  const [signalPeriodMs, setSignalPeriodMs] = useState<number>(0);
  const periodHistory = useRef<number[]>([]);
  const avgPeriodMs = useRef<number>(0);

  const updateSignalPeriod = useCallback((newPeriod: number) => {
    periodHistory.current.push(newPeriod);
    if (periodHistory.current.length > ROLLING_AVG_HISTORY_LENGTH) {
      periodHistory.current.shift();
    }
    const total = periodHistory.current.reduce((sum, val) => sum + val, 0);
    const average = total / periodHistory.current.length;
    avgPeriodMs.current = average;
    setSignalPeriodMs(Math.round(average));
  }, []);

  const reset = useCallback(() => {
    periodHistory.current = [];
    avgPeriodMs.current = 0;
    setSignalPeriodMs(0);
  }, []);

  useEffect(() => {
    if (!isEnabled || lastDataTimestamp === 0) {
        reset();
        return;
    }

    // This is the first packet in a new stream
    if (periodHistory.current.length === 0) {
        return;
    }

    const delta = Date.now() - lastDataTimestamp;
    updateSignalPeriod(delta)

  },[lastDataTimestamp, isEnabled, updateSignalPeriod, reset])


  // Heartbeat for proactive signal quality assessment
  useEffect(() => {
    if (!isEnabled) return;

    const heartbeat = setInterval(() => {
      if (lastDataTimestamp === 0) return;

      const now = Date.now();
      const timeSinceLastData = now - lastDataTimestamp;

      const threshold = Math.max(
        avgPeriodMs.current + MISSED_PACKET_THRESHOLD_BUFFER_MS,
        MIN_MISSED_PACKET_THRESHOLD_MS
      );

      if (timeSinceLastData > threshold) {
        updateSignalPeriod(timeSinceLastData);
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(heartbeat);
  }, [isEnabled, lastDataTimestamp, updateSignalPeriod]);

  return { signalPeriodMs, resetSignalQuality: reset };
};
