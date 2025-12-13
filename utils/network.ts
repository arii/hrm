// utils/network.ts
import { IncomingMessage } from 'http';

export function getClientIp(req: IncomingMessage): string {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (typeof xForwardedFor === 'string') {
    const ips = xForwardedFor.split(',').map(ip => ip.trim());
    for (let i = ips.length - 1; i >= 0; i--) {
      const ip = ips[i];
      // This is a simplified check. A production implementation should
      // have a configurable list of trusted proxies.
      if (ip !== '127.0.0.1' && !ip.startsWith('10.') && !ip.startsWith('192.168.')) {
        return ip;
      }
    }
    return ips[0];
  }
  return req.socket.remoteAddress || 'unknown';
}
