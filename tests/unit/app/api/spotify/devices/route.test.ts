import { GET } from '@/app/api/spotify/devices/route';
import { getServerSession } from 'next-auth/next';
import { SpotifyTokenManager } from '@/services/spotifyTokenManager';

jest.mock('next-auth/next');
jest.mock('@/services/spotifyTokenManager');

describe('/api/spotify/devices GET', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return devices using the system token when the user is not logged in', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    (SpotifyTokenManager.prototype.getValidAccessToken as jest.Mock).mockResolvedValue('system_token');

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ devices: [{ id: '1', name: 'System Device' }] }),
      })
    ) as jest.Mock;

    const response = await GET(new Request('http://localhost/api/spotify/devices'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([{ id: '1', name: 'System Device' }]);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.spotify.com/v1/me/player/devices',
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer system_token',
        },
      })
    );
  });
});
