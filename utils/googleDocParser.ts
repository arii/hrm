// File: utils/googleDocParser.ts
import * as cheerio from 'cheerio';

export interface WorkoutItem {
  category: string;
  exercise: string;
  sets: string;
  reps: string;
  tempo: string;
  rest: string;
  rpe: string;
}

const DOC_URL = 'https://docs.google.com/document/d/e/2PACX-1vTev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ/pub';

export const parseGoogleDocTable = async (): Promise<WorkoutItem[]> => {
  try {
    const response = await fetch(DOC_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch Google Doc: ${response.statusText}`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);

    const table = $('#contents table').first();
    const workoutData: WorkoutItem[] = [];
    const rows = table.find('tr');

    if (rows.length > 0) {
      const columns: string[][] = [];
      const numColumns = rows.first().find('td').length;

      for (let i = 0; i < numColumns; i++) {
        columns.push([]);
      }

      rows.each((i, row) => {
        $(row).find('td').each((j, cell) => {
          $(cell).find('p').each((k, p) => {
            const text = $(p).text().trim();
            if (text) {
              columns[j].push(text);
            }
          });
        });
      });

      if (columns.length > 0) {
        const numRows = columns[0].length;
        for (let i = 0; i < numRows; i++) {
          workoutData.push({
            category: columns[0][i] || '',
            exercise: columns[1][i] || '',
            sets: columns[2][i] || '',
            reps: columns[3][i] || '',
            tempo: columns[4][i] || '',
            rest: columns[5][i] || '',
            rpe: columns[6] ? columns[6][i] || '' : '',
          });
        }
      }
    }

    return workoutData;
  } catch (error) {
    console.error('Error parsing Google Doc:', error);
    return [];
  }
};
