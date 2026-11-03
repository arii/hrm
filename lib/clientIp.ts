/**
 * Trust-proxy-aware client IP resolution.
 *
 * Parses X-Forwarded-For right-to-left: with N trusted proxy hops, the
 * client IP is the entry N positions left of the direct peer
 * (remoteAddress). A forged leftmost entry can therefore never impersonate
 * another client — at worst it shifts which untrusted entry is picked when
 * fewer than N proxies are actually present.
 */
export const resolveClientIp = (
  forwardedFor: string | string[] | undefined,
  remoteAddress: string | undefined,
  trustedHops: number
): string => {
  const raw = Array.isArray(forwardedFor)
    ? forwardedFor.join(',')
    : (forwardedFor ?? '')
  const chain = [
    ...raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean),
    ...(remoteAddress ? [remoteAddress] : []),
  ]
  if (chain.length === 0) return 'unknown'
  const hops = Math.max(0, trustedHops)
  const index = Math.max(0, chain.length - 1 - hops)
  return chain[index] ?? 'unknown'
}
