import { NextRequest } from 'next/server'

/**
 * Extracts the real client IP from an incoming request.
 *
 * On Vercel, the platform APPENDS the real client IP as the LAST entry in
 * x-forwarded-for. Clients can inject arbitrary values at the front of this
 * header, but they cannot spoof the value Vercel appends at the end.
 *
 * Using the first value (as commonly seen in old tutorials) allows attackers
 * to bypass IP-based rate limits by sending:
 *   x-forwarded-for: 1.2.3.4, 5.6.7.8, ...
 */
export function getClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const parts = xff.split(',').map(s => s.trim())
    return parts[parts.length - 1] || 'unknown'
  }
  return request.headers.get('x-real-ip') || 'unknown'
}
