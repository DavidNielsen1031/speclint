"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Copy, ArrowRight, Key, Loader2 } from "lucide-react"
import Link from "next/link"

const MAX_ATTEMPTS = 45   // 90 seconds total — covers slow Stripe webhook delivery + Vercel cold starts
const RETRY_DELAY_MS = 2000

function SuccessContent() {
  const [licenseKey, setLicenseKey] = useState<string | null>(null)
  const [licenseEmail, setLicenseEmail] = useState<string | null>(null)
  const [licenseStatus, setLicenseStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const [copied, setCopied] = useState(false)
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const fetchLicenseKey = useCallback(async (currentAttempt = 0) => {
    if (!sessionId) {
      setLicenseStatus('error')
      return
    }

    try {
      const res = await fetch(`/api/license?session_id=${encodeURIComponent(sessionId)}`)
      if (res.status === 202) {
        if (currentAttempt < MAX_ATTEMPTS) {
          setAttempt(currentAttempt + 1)
          setTimeout(() => fetchLicenseKey(currentAttempt + 1), RETRY_DELAY_MS)
        } else {
          setLicenseStatus('error')
        }
        return
      }
      if (!res.ok) {
        setLicenseStatus('error')
        return
      }
      const data = await res.json()
      setLicenseKey(data.licenseKey)
      setLicenseEmail(data.email)
      setLicenseStatus('ready')
    } catch {
      if (currentAttempt < MAX_ATTEMPTS) {
        setAttempt(currentAttempt + 1)
        setTimeout(() => fetchLicenseKey(currentAttempt + 1), RETRY_DELAY_MS)
      } else {
        setLicenseStatus('error')
      }
    }
  }, [sessionId])

  useEffect(() => {
    fetchLicenseKey(0)
  }, [fetchLicenseKey])

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  // How far through the wait we are — used to adjust messaging
  const waitSeconds = attempt * (RETRY_DELAY_MS / 1000)

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-8">

        {/* Success Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-emerald-500/10 p-4 rounded-full">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome to Speclint! 🎉
          </h1>
          <p className="text-lg text-muted-foreground">
            {licenseEmail ? `Subscription active for ${licenseEmail}.` : 'Your subscription is now active.'}
          </p>
        </div>

        {/* License Key Card */}
        <Card className="border-emerald-500/20 bg-emerald-50/5">
          <CardHeader>
            <CardTitle className="text-emerald-400 flex items-center gap-2">
              <Key className="h-5 w-5" />
              Your License Key
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Loading state — active and reassuring */}
            {licenseStatus === 'loading' && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400 shrink-0" />
                  <span>
                    {waitSeconds < 6
                      ? 'Activating your license key…'
                      : waitSeconds < 16
                      ? 'Almost there — finalizing your subscription…'
                      : 'Taking a little longer than usual, still working…'}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500/60 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((attempt / MAX_ATTEMPTS) * 100, 95)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Ready state */}
            {licenseStatus === 'ready' && licenseKey && (
              <>
                <p className="text-sm text-muted-foreground">
                  Save this key — you&apos;ll need it for the CLI and API. You can always retrieve it at{' '}
                  <Link href="/get-key" className="text-emerald-400 hover:underline">/get-key</Link>.
                </p>
                <div className="flex gap-2">
                  <code className="flex-1 bg-muted/50 border border-muted p-3 rounded-lg text-sm font-mono tracking-wide break-all">
                    {licenseKey}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 self-start mt-1"
                    onClick={() => handleCopy(licenseKey)}
                  >
                    {copied
                      ? <><CheckCircle2 className="h-4 w-4 mr-1 text-emerald-400" />Copied</>
                      : <><Copy className="h-4 w-4 mr-1" />Copy</>}
                  </Button>
                </div>

                {/* CLI quickstart */}
                <div className="bg-muted/30 p-4 rounded-lg border border-muted space-y-2">
                  <h4 className="font-semibold text-sm text-foreground">Quick start — CLI</h4>
                  <code className="block text-xs font-mono text-emerald-400 break-all">
                    npx speclint-cli --key {licenseKey} &quot;Fix login bug&quot; &quot;Add dark mode&quot;
                  </code>
                  <p className="text-xs text-muted-foreground">
                    Or export <code className="font-mono">SPECLINT_KEY={licenseKey}</code> and drop the flag.
                  </p>
                </div>

                {/* API quickstart */}
                <div className="bg-muted/30 p-4 rounded-lg border border-muted space-y-2">
                  <h4 className="font-semibold text-sm text-foreground">Quick start — API</h4>
                  <code className="block text-xs font-mono text-muted-foreground break-all whitespace-pre-wrap">{`curl -X POST https://speclint.ai/api/refine \\
  -H "Content-Type: application/json" \\
  -H "x-license-key: ${licenseKey}" \\
  -d '{"items":["Fix login bug"]}'`}</code>
                </div>
              </>
            )}

            {/* Error / timeout state — self-service, no dead ends */}
            {licenseStatus === 'error' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Your payment was successful — the key is just taking longer than expected to activate.
                  It&apos;s on its way.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Link
                    href="/get-key"
                    className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                  >
                    <Key className="h-4 w-4" />
                    Retrieve my key at /get-key
                  </Link>
                  <a
                    href="mailto:support@speclint.ai?subject=License%20Key%20Request&body=Hi%2C%20I%20just%20subscribed%20and%20my%20key%20hasn%27t%20appeared%20yet."
                    className="flex items-center justify-center gap-2 rounded-lg border border-muted px-4 py-3 text-sm font-medium text-muted-foreground hover:border-foreground/30 transition-colors"
                  >
                    Contact support
                  </a>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter the email you used to subscribe at{' '}
                  <Link href="/get-key" className="text-emerald-400 hover:underline">
                    speclint.ai/get-key
                  </Link>{' '}
                  and your key will appear immediately.
                </p>
              </div>
            )}

          </CardContent>
        </Card>

        {/* Action Buttons */}
        {licenseStatus === 'ready' && (
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-emerald-500 hover:bg-emerald-600">
              <Link href="/#refiner">
                <ArrowRight className="mr-2 h-4 w-4" />
                Start Linting Specs
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href="mailto:support@speclint.ai?subject=Speclint%20Pro%20Support">
                Get Help &amp; Support
              </a>
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground">
            Lost your key?{" "}
            <Link href="/get-key" className="text-emerald-400 hover:underline">
              Retrieve it anytime at /get-key
            </Link>
          </p>
          <p className="text-sm text-muted-foreground">
            Questions?{" "}
            <a href="mailto:support@speclint.ai" className="text-emerald-400 hover:underline">
              support@speclint.ai
            </a>
          </p>
        </div>

      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
