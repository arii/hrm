/**
 * @jest-environment jsdom
 */
import { generateFitFile } from '@/lib/export/fit-generator';

describe('fit-generator', () => {
  it('should generate a non-empty FIT file blob', () => {
    const testData = {
      startTime: Date.now(),
      durationSeconds: 120,
      totalCalories: 150,
      records: [
        { time: Date.now() + 1000, hr: 120 },
        { time: Date.now() + 2000, hr: 125 },
        { time: Date.now() + 3000, hr: 130 },
      ],
    };

    const blob = generateFitFile(testData);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe('application/octet-stream');
  });
});
