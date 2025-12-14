// api/health/simple/route.ts
export async function GET() {
  // Minimal health check for load balancer
  return Response.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  )
}
