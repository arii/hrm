/**
 * @jest-environment node
 */
import { resolveClientIp } from '@/lib/clientIp'

describe('resolveClientIp', () => {
  it('returns the peer when no forwarding header is present', () => {
    expect(resolveClientIp(undefined, '10.0.0.5', 1)).toBe('10.0.0.5')
    expect(resolveClientIp('', '10.0.0.5', 1)).toBe('10.0.0.5')
  })

  it('returns unknown when nothing is known', () => {
    expect(resolveClientIp(undefined, undefined, 1)).toBe('unknown')
  })

  it('skips one trusted proxy hop (single Caddy/nginx)', () => {
    expect(resolveClientIp('203.0.113.7', '172.18.0.2', 1)).toBe('203.0.113.7')
  })

  it('ignores a forged leftmost entry behind a real proxy', () => {
    // Attacker sends XFF "forged"; proxy appends the real client IP.
    expect(resolveClientIp('forged, 203.0.113.7', '172.18.0.2', 1)).toBe(
      '203.0.113.7'
    )
  })

  it('supports multiple trusted hops', () => {
    expect(resolveClientIp('203.0.113.7, 10.1.0.1', '172.18.0.2', 2)).toBe(
      '203.0.113.7'
    )
  })

  it('clamps when fewer hops are present than trusted', () => {
    expect(resolveClientIp(undefined, '10.0.0.5', 3)).toBe('10.0.0.5')
  })

  it('joins repeated headers and trims whitespace', () => {
    expect(
      resolveClientIp([' 203.0.113.7 ', '10.1.0.1'], '172.18.0.2', 1)
    ).toBe('10.1.0.1')
  })

  it('treats zero trusted hops as direct connection', () => {
    expect(resolveClientIp('forged', '10.0.0.5', 0)).toBe('10.0.0.5')
  })
})
