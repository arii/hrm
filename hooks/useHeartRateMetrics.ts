import { useState, useEffect } from 'react';
import { HrmData } from '../types/websocket';

export const useHeartRateMetrics = (clientId: string, hrmData: HrmData[]) => {
  const [heartRateHistory, setHeartRateHistory] = useState<number[]>([]);
  const [averageHeartRate, setAverageHeartRate] = useState<number>(0);
  const [maxHeartRate, setMaxHeartRate] = useState<number>(0);
  const [currentHeartRate, setCurrentHeartRate] = useState<number | null>(null);

  useEffect(() => {
    const userHrmData = hrmData.find((user) => user.clientId === clientId);
    if (userHrmData && userHrmData.value !== null) {
      const newHeartRate = userHrmData.value;
      setCurrentHeartRate(newHeartRate);
      setHeartRateHistory((prevHistory) => [...prevHistory, newHeartRate]);
    }
  }, [clientId, hrmData]);

  useEffect(() => {
    if (heartRateHistory.length > 0) {
      const sum = heartRateHistory.reduce((a, b) => a + b, 0);
      setAverageHeartRate(Math.round(sum / heartRateHistory.length));
      setMaxHeartRate(Math.max(...heartRateHistory));
    }
  }, [heartRateHistory]);

  return { currentHeartRate, averageHeartRate, maxHeartRate };
};
