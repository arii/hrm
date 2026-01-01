/**
 * @jest-environment node
 */
import request from 'supertest';
import { expressApp } from '../../server';

describe('Health Check Endpoints', () => {
  it('should return 200 OK and status ready from /health/ready', async () => {
    // The server.ts file adds routes to expressApp directly.
    // We can test these routes without starting the full Next.js server,
    // which avoids the complexities of the Next.js test environment.
    const response = await request(expressApp).get('/health/ready');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ready' });
  });
});
