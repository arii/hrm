// /app/api/health/route.ts
import { NextResponse } from 'next/server'

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Liveness Probe
 *     description: Performs a basic liveness check to confirm the server is running.
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Server is healthy.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  })
}
