/**
 * @jest-environment node
 */
import { POST } from '@/app/api/auth/sync/route';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { env } from '@/lib/env';

// Mock dependencies
jest.mock('next-auth/jwt');
jest.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_API_URL: 'http://localhost:3000',
    INTERNAL_API_SECRET: 'test-secret',
  },
}));

// Mock global fetch
global.fetch = jest.fn();

const mockedGetToken = getToken as jest.Mock;
const mockedFetch = global.fetch as jest.Mock;

describe('API Route: /api/auth/sync', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should return 401 if no session token is found', async () => {
      mockedGetToken.mockResolvedValue(null);
      const request = new NextRequest('http://localhost/api/auth/sync', {
        method: 'POST',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Invalid session token' });
    });

    it('should return 401 if the session token is missing required fields', async () => {
      mockedGetToken.mockResolvedValue({ accessToken: 'test' });
      const request = new NextRequest('http://localhost/api/auth/sync', {
        method: 'POST',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Invalid session token' });
    });

    it('should call the internal token delivery endpoint and return 200 on success', async () => {
      const mockToken = {
        accessToken: 'test-access-token',
        accessTokenExpiresAt: 12345,
        refreshToken: 'test-refresh-token',
      };
      mockedGetToken.mockResolvedValue(mockToken);
      mockedFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      const request = new NextRequest('http://localhost/api/auth/sync', {
        method: 'POST',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(mockedFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/internal/token-delivery',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-api-secret': 'test-secret',
          },
          body: JSON.stringify(mockToken),
        }
      );
    });

    it('should return an error if the internal endpoint call fails', async () => {
      const mockToken = {
        accessToken: 'test-access-token',
        accessTokenExpiresAt: 12345,
        refreshToken: 'test-refresh-token',
      };
      mockedGetToken.mockResolvedValue(mockToken);
      mockedFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal error' }),
      } as Response);

      const request = new NextRequest('http://localhost/api/auth/sync', {
        method: 'POST',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: 'Failed to sync token',
        details: { error: 'Internal error' },
      });
    });
  });
});
