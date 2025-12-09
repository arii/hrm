// services/WorkoutRepository.ts
import fs from 'fs/promises';
import path from 'path';
import { WorkoutSession } from '@/types/data-models';
import { legacyAdapter } from './LegacyAdapter';
import logger from '@/utils/logger';

const LIVE_DATA_PATH = process.env.WORKOUTS_REPO_PATH || path.join(process.cwd(), 'data/workouts');

class WorkoutRepository {
  private async ensureDir() {
    try {
      await fs.access(LIVE_DATA_PATH);
    } catch {
      logger.warn(`Workout directory ${LIVE_DATA_PATH} not found. Creating it.`);
      await fs.mkdir(LIVE_DATA_PATH, { recursive: true });
    }
  }

  public async saveSession(session: WorkoutSession): Promise<void> {
    await this.ensureDir();

    const datePrefix = new Date(session.startedAt).toISOString().replace(/[:.]/g, '-');
    const fileName = `${datePrefix}_${session.id}.json`;
    const filePath = path.join(LIVE_DATA_PATH, fileName);

    await fs.writeFile(filePath, JSON.stringify(session, null, 2), 'utf-8');
    logger.info(`[WorkoutRepository] Saved session to ${filePath}`);
  }

  public async getAllSessions(): Promise<WorkoutSession[]> {
    const legacySessions = await legacyAdapter.getSessions();
    const liveSessions = await this.getLiveSessions();

    return [...liveSessions, ...legacySessions].sort((a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }

  private async getLiveSessions(): Promise<WorkoutSession[]> {
    try {
      await fs.access(LIVE_DATA_PATH);
      const files = await fs.readdir(LIVE_DATA_PATH);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      const sessions = await Promise.all(jsonFiles.map(async file => {
        const content = await fs.readFile(path.join(LIVE_DATA_PATH, file), 'utf-8');
        const s = JSON.parse(content);
        s.source = 'live_tracking';
        return s as WorkoutSession;
      }));
      return sessions;
    } catch {
      return [];
    }
  }
}

export default new WorkoutRepository();
