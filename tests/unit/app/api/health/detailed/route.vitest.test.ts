/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterAll, beforeAll } from 'vitest';
import { GET } from '../../../../../../app/api/health/detailed/route';
import * as healthCheck from '../../../../../../lib/healthCheck';

vi.mock('../../../../../../lib/healthCheck');

global.fetch = vi.fn();

describe('/api/health/detailed', () => {
  const mockedHealthCheck = healthCheck as vi.Mocked<typeof healthCheck>;

  beforeAll(() => {
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
  });

  afterAll(() => {
    delete process.env.NEXTAUTH_URL;
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return a healthy response when all checks pass', async () => {
    mockedHealthCheck.checkMemoryUsage.mockReturnValue({
      healthy: true,
      details: {},
    });
    mockedHealthCheck.checkSpotifyAPI.mockResolvedValue({
      healthy: true,
      details: {},
    });
    (global.fetch as vi.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ healthy: true, details: {} }),
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('healthy');
  });

  it('should return a degraded response when one check fails', async () => {
    mockedHealthCheck.checkMemoryUsage.mockReturnValue({
      healthy: true,
      details: {},
    });
    mockedHealthCheck.checkSpotifyAPI.mockResolvedValue({
      healthy: false,
      details: {},
    });
    (global.fetch as vi.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ healthy: true, details: {} }),
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe('degraded');
  });
});
