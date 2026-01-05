/**
 * @jest-environment jsdom
 */
import { generateFitFile } from '@/lib/export/fit-generator';
import FitParser from 'fit-file-parser';

describe('fit-generator', () => {
  it('should generate a FIT file with correct user profile data', async () => {
    const testData = {
      startTime: Date.now(),
      durationSeconds: 120,
      totalCalories: 150,
      records: [
        { time: Date.now() + 1000, hr: 120 },
        { time: Date.now() + 2000, hr: 125 },
        { time: Date.now() + 3000, hr: 130 },
      ],
      userWeight: 75,
      userAge: 30,
    };

    const blob = generateFitFile(testData);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe('application/octet-stream');

    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });

    const fitParser = new FitParser({ force: true });

    await new Promise((resolve) => {
      fitParser.parse(arrayBuffer, (err: any, data: any) => {
        console.log(JSON.stringify(data, null, 2));
        expect(err).toBeFalsy();
        expect(data.user_profile).toBeDefined();
        expect(data.user_profile.weight).toBe(75);
        expect(data.user_profile.age).toBe(30);
        resolve(data);
      });
    });
  }, 15000);
});
