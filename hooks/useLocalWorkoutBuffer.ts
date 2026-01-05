// hooks/useLocalWorkoutBuffer.ts
import { useEffect } from 'react';
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

  useEffect(() => {
    let tick: NodeJS.Timeout | null = null;
    if (status === 'running' && currentHr > 0) {
      tick = setInterval(() => {
        const zoneProps = getHrZoneProps(currentHr, maxHr);
        setBuffer(prev => [
          ...prev,
          {
            time: Date.now(),
            hr: currentHr,
            zone: zoneProps.zone as HrZoneName,
          },
        ]);
      }, 1000);
    }
    return () => {
      if (tick) {
        clearInterval(tick);
      }
    };
  }, [status, currentHr, maxHr]);

  const clearBuffer = () => {
    setBuffer([]);
  };

  return { buffer, clearBuffer };
};
