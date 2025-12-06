// tests/unit/HeartRateService.test.ts
import { heartRateService } from '@/services/HeartRateService';
import { HR_ZONES } from '@/utils/visualization';

describe('HeartRateService', () => {
  beforeEach(() => {
    heartRateService.reset();
  });

  it('should start a session', () => {
    heartRateService.startSession();
    const summary = heartRateService.getWorkoutSummary();
    expect(summary).not.toBeNull();
    expect(summary?.startTime).not.toBeNull();
    expect(summary?.endTime).toBeNull();
  });

  it('should stop a session', () => {
    heartRateService.startSession();
    heartRateService.stopSession();
    const summary = heartRateService.getWorkoutSummary();
    expect(summary?.endTime).not.toBeNull();
  });

  it('should add HR readings', () => {
    heartRateService.startSession();
    heartRateService.addHrReading(120, 180);
    heartRateService.addHrReading(130, 180);
    const summary = heartRateService.getWorkoutSummary();
    expect(summary?.averageHr).toBe(125);
  });

  it('should calculate time in zones', () => {
    heartRateService.startSession();
    // Fat Burn zone
    heartRateService.addHrReading(110, 180); // ~61%
    // Cardio zone
    heartRateService.addHrReading(130, 180); // ~72%
    heartRateService.addHrReading(140, 180); // ~78%
    // Peak zone
    heartRateService.addHrReading(160, 180); // ~89%
    const summary = heartRateService.getWorkoutSummary();
    expect(summary?.timeInZones['Fat Burn']).toBe(1);
    expect(summary?.timeInZones['Cardio']).toBe(2);
    expect(summary?.timeInZones['Peak']).toBe(1);
    expect(summary?.timeInZones['Warm-up']).toBe(0);
  });
});
