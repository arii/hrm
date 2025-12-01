// File: tests/unit/services/heartRateService.test.ts
/**
 * @jest-environment node
 */
import HeartRateService from '../../../services/heartRateService';

describe('HeartRateService', () => {
  let heartRateService: HeartRateService;

  beforeEach(() => {
    heartRateService = new HeartRateService();
  });

  it('should be defined', () => {
    expect(heartRateService).toBeDefined();
  });

  it('should return null analytics if not enough data', () => {
    heartRateService.addData(120);
    const analytics = heartRateService.getAnalytics(200);
    expect(analytics).toBeNull();
  });

  it('should calculate correct analytics', () => {
    jest.spyOn(Date, 'now')
      .mockReturnValueOnce(new Date('2023-01-01T00:00:00.000Z').getTime())
      .mockReturnValueOnce(new Date('2023-01-01T00:00:10.000Z').getTime())
      .mockReturnValueOnce(new Date('2023-01-01T00:00:20.000Z').getTime())
      .mockReturnValueOnce(new Date('2023-01-01T00:00:30.000Z').getTime());

    heartRateService.addData(120); // 60%
    heartRateService.addData(140); // 70%
    heartRateService.addData(160); // 80%
    heartRateService.addData(180); // 90%

    const analytics = heartRateService.getAnalytics(200);

    expect(analytics).not.toBeNull();
    if (analytics) {
      expect(analytics.min).toBe(120);
      expect(analytics.max).toBe(180);
      expect(analytics.average).toBe(150);

      // Corrected expectation for zones based on implementation
      const fatBurnZone = analytics.zones.find(z => z.zone === 'Fat Burn');
      const cardioZone = analytics.zones.find(z => z.zone === 'Cardio');
      const peakZone = analytics.zones.find(z => z.zone === 'Peak');

      expect(fatBurnZone?.time).toBe(10);
      expect(cardioZone?.time).toBe(10);
      expect(peakZone?.time).toBe(10);
    }
  });

  it('should reset data', () => {
    heartRateService.addData(120);
    heartRateService.reset();
    const analytics = heartRateService.getAnalytics(200);
    expect(analytics).toBeNull();
  });
});
