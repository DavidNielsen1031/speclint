import { cookies } from 'next/headers'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getLicenseData } from '@/lib/kv'
import { AuthForm } from './AuthForm'
import { DashboardCharts } from './DashboardCharts'
import { ActivityFeed } from './ActivityFeed'
import { fetchDashboardData, getRecentLintEvents } from './data'
import { clearDashboardSession } from './actions'

export const metadata: Metadata = {
  title: 'Dashboard — Speclint',
  description: 'Your Speclint usage dashboard — score trends, agent-ready rates, and call volume.',
  robots: { index: false, follow: false },
}

// Revalidate every 5 minutes
export const revalidate = 300

const COOKIE_NAME = 'sl-dashboard-key'

interface DashboardPageProps {
  searchParams: Promise<{ view?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const cookieStore = await cookies()
  const licenseKey = cookieStore.get(COOKIE_NAME)?.value ?? null

  // Validate stored key
  let validKey: string | null = null
  let tier: string | null = null

  if (licenseKey) {
    const licenseData = await getLicenseData(licenseKey)
    if (
      licenseData &&
      licenseData.status === 'active' &&
      (licenseData.plan === 'pro' || licenseData.plan === 'team')
    ) {
      validKey = licenseKey
      tier = licenseData.plan
    }
  }

  // Not authenticated → show auth gate
  if (!validKey) {
    return <AuthForm />
  }

  // Resolve search params — default to "global" (All Data) view
  const params = await searchParams
  const view = params.view === 'mine' ? 'mine' : 'global'
  const isGlobal = view === 'global'

  // Fetch dashboard data + recent events in parallel
  const [data, recentEvents] = await Promise.all([
    fetchDashboardData(validKey, { global: isGlobal }),
    getRecentLintEvents(validKey, isGlobal, 20),
  ])

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Nav header */}
      <div className="border-b border-zinc-800 sticky top-0 z-10 bg-zinc-950/90 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="font-mono font-bold text-white text-lg hover:text-emerald-400 transition-colors"
          >
            speclint
          </Link>
          <nav className="flex items-center gap-6 text-sm font-mono">
            <Link href="/pricing" className="text-zinc-400 hover:text-zinc-100 transition-colors">
              pricing
            </Link>
            <Link href="/blog" className="text-zinc-400 hover:text-zinc-100 transition-colors">
              blog
            </Link>
            <Link href="/dashboard" className="text-emerald-400">
              dashboard
            </Link>
            <form action={clearDashboardSession}>
              <button
                type="submit"
                className="text-zinc-600 hover:text-zinc-400 transition-colors text-xs"
              >
                sign out
              </button>
            </form>
          </nav>
        </div>
      </div>

      {/* Page content */}
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-zinc-400 text-sm mt-1 font-mono">
              Last 30 days ·{' '}
              <span className="text-emerald-400">
                {tier === 'team' ? '👥 Team' : '💎 Pro'}
              </span>
            </p>
          </div>
          <div className="text-xs font-mono text-zinc-600 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg">
            key: {validKey.slice(0, 12)}…
          </div>
        </div>

        {/* Data toggle */}
        <div className="flex items-center gap-2 mb-8">
          <span className="text-zinc-500 text-xs font-mono">Showing:</span>
          <div className="flex rounded-lg border border-zinc-800 overflow-hidden font-mono text-xs">
            <Link
              href="/dashboard?view=global"
              className={`px-4 py-1.5 transition-colors ${
                isGlobal
                  ? 'bg-emerald-500/10 text-emerald-400 border-r border-zinc-800'
                  : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 border-r border-zinc-800'
              }`}
            >
              All Data
            </Link>
            <Link
              href="/dashboard?view=mine"
              className={`px-4 py-1.5 transition-colors ${
                !isGlobal
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              My Data
            </Link>
          </div>
          {isGlobal && (
            <span className="text-zinc-600 text-xs font-mono">
              — all API calls across all users
            </span>
          )}
        </div>

        <DashboardCharts data={data} />

        {/* Recent Activity feed */}
        <div className="mt-10">
          <h2 className="text-xl font-bold text-white mb-4 font-mono">Recent Activity</h2>
          <ActivityFeed events={recentEvents} />
        </div>
      </div>
    </main>
  )
}
