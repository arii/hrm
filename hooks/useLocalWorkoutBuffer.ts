// hooks/useLocalWorkoutBuffer.ts
import { useEffect, useRef } from 'react';
import useLocalStorage from '@/hooks/useLocalStorage';
import { getHrZoneProps } from '@/utils/visualization';
import { HrZoneName } from '@/lib/shared/hr-zones';
import { useUserSettings } from '@/context/UserSettingsContext';
import { calculateMaxHr } from '@/lib/hrm/zones';

export interface WorkoutDataPoint {
  time: number;
  hr: number;
  zone: HrZoneName;
}

export const useLocalWorkoutBuffer = (currentHr: number, status: string) => {
  const [userSettings] = useUserSettings();
  const [buffer, setBuffer] = useLocalStorage<WorkoutDataPoint[]>('workoutBuffer', []);
  const maxHr = calculateMaxHr(userSettings.userAge || 0);
  const currentHrRef = useRef(currentHr);

  useEffect(() => {
    currentHrRef.current = currentHr;
  }, [currentHr]);

  useEffect(() => {
    let tick: NodeJS.Timeout | null = null;
    if (status === 'running') {
      tick = setInterval(() => {
        if (currentHrRef.current > 0) {
          const zoneProps = getHrZoneProps(currentHrRef.current, maxHr);
          setBuffer(prev => [
            ...prev,
            {
              time: Date.now(),
              hr: currentHrRef.current,
              zone: zoneProps.zone as HrZoneName,
            },
          ]);
        }
      }, 1000);
    }
    return () => {
      if (tick) {
        clearInterval(tick);
      }
    };
  }, [status, maxHr, setBuffer]);

  const clearBuffer = () => {
    setBuffer([]);
  };

  return { buffer, clearBuffer };
};
