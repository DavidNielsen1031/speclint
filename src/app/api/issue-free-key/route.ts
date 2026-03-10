import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getFreeKey, setFreeKey, checkRateLimitKV, getKV } from '@/lib/kv'

function generateFreeKey(): string {
  const chars = randomBytes(9).toString('hex').toUpperCase().slice(0, 12)
  return `SK-FREE-${chars}`
}

// Hardcoded fallback — overridable via KV key 'config:disposable-domains' (JSON array)
const DEFAULT_DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
  'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
  'dispostable.com', 'trashmail.com', 'temp-mail.org', 'fakeinbox.com',
  'mailnesia.com', 'maildrop.cc', 'discard.email', 'mailsac.com',
  'getnada.com', '10minutemail.com', 'tempail.com', 'harakirimail.com',
  // Extended list
  'mohmal.com', 'emailondeck.com', 'burnermail.io', 'inboxkitten.com',
  'minutemail.com', 'tempmailo.com', 'guerrillamail.info', 'spam4.me',
  'trash-mail.com', 'simplelogin.io', 'anonaddy.com', 'anonaddy.me',
  '33mail.com', 'duck.com', 'mozmail.com',
])

let cachedDisposableDomains: Set<string> | null = null
let cacheExpiry = 0

async function getDisposableDomains(): Promise<Set<string>> {
  const now = Date.now()
  if (cachedDisposableDomains && now < cacheExpiry) return cachedDisposableDomains

  try {
    const kvDomains = await getKV('config:disposable-domains')
    if (kvDomains && Array.isArray(JSON.parse(kvDomains))) {
      cachedDisposableDomains = new Set(JSON.parse(kvDomains))
      cacheExpiry = now + 3600_000 // Cache for 1 hour
      return cachedDisposableDomains
    }
  } catch {
    // KV unavailable or invalid — fall through to hardcoded
  }

  cachedDisposableDomains = DEFAULT_DISPOSABLE_DOMAINS
  cacheExpiry = now + 300_000 // Cache fallback for 5 minutes
  return cachedDisposableDomains
}

/**
 * Normalize email to prevent alias farming:
 * - Lowercase and trim
 * - Strip Gmail-style '+' aliases (user+tag@gmail.com → user@gmail.com)
 * - Strip Gmail dots (u.s.e.r@gmail.com → user@gmail.com)
 * - Normalize googlemail.com → gmail.com
 */
function normalizeEmail(raw: string): string {
  let email = raw.toLowerCase().trim()
  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return email

  let normalizedLocal = localPart
  let normalizedDomain = domain

  // Normalize googlemail.com → gmail.com
  if (normalizedDomain === 'googlemail.com') {
    normalizedDomain = 'gmail.com'
  }

  // Strip '+' aliases for all providers (Gmail, Outlook, Fastmail, etc.)
  const plusIdx = normalizedLocal.indexOf('+')
  if (plusIdx > 0) {
    normalizedLocal = normalizedLocal.substring(0, plusIdx)
  }

  // Strip dots for Gmail (dots are insignificant in Gmail local parts)
  if (normalizedDomain === 'gmail.com') {
    normalizedLocal = normalizedLocal.replace(/\./g, '')
  }

  return `${normalizedLocal}@${normalizedDomain}`
}

const ALLOWED_ORIGINS = ['https://speclint.ai', 'https://www.speclint.ai', 'http://localhost:3000', 'http://localhost:3099']

export async function POST(request: NextRequest) {
  try {
    // B3: CSRF protection — verify request comes from our domain
    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')
    if (origin) {
      // Origin header present — must match allowed origins
      if (!ALLOWED_ORIGINS.includes(origin)) {
        return NextResponse.json(
          { error: 'Cross-origin requests not allowed' },
          { status: 403 }
        )
      }
    } else if (referer) {
      // No Origin but has Referer — check referer starts with allowed origin
      const refererAllowed = ALLOWED_ORIGINS.some(o => referer.startsWith(o))
      if (!refererAllowed) {
        return NextResponse.json(
          { error: 'Cross-origin requests not allowed' },
          { status: 403 }
        )
      }
    }
    // If neither Origin nor Referer present, allow (CLI tools, curl, API clients)

    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== 'string' || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    // IP-based rate limiting on key issuance (5 keys per IP per day)
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const ipRateCheck = await checkRateLimitKV(ip, 5, 'ratelimit-free-key')
    if (!ipRateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many key requests from this IP. Try again tomorrow.' },
        { status: 429 }
      )
    }

    const normalizedEmail = normalizeEmail(email)

    // Block disposable email domains (KV-overridable with hardcoded fallback)
    const disposableDomains = await getDisposableDomains()
    const domain = normalizedEmail.split('@')[1]
    if (domain && disposableDomains.has(domain)) {
      return NextResponse.json(
        { error: 'Please use a non-disposable email address.' },
        { status: 400 }
      )
    }

    // Idempotent: return existing free key if already issued
    const existing = await getFreeKey(normalizedEmail)
    if (existing) {
      return NextResponse.json({ licenseKey: existing, plan: 'free', isNew: false })
    }

    // Issue new free key
    const licenseKey = generateFreeKey()
    await setFreeKey(normalizedEmail, licenseKey)

    return NextResponse.json({ licenseKey, plan: 'free', isNew: true })
  } catch (error) {
    console.error('[issue-free-key] Error:', error)
    return NextResponse.json({ error: 'Failed to issue free key' }, { status: 500 })
  }
}
