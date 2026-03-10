"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Key, Copy, CheckCircle2, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"

export default function GetKeyPage() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<'idle' | 'loading' | 'found' | 'not-found' | 'error'>('idle')
  const [licenseKey, setLicenseKey] = useState<string | null>(null)
  const [plan, setPlan] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setStatus('loading')
    setLicenseKey(null)

    try {
      // First: check for existing paid key
      const res = await fetch('/api/retrieve-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (data.found && data.licenseKey) {
        setLicenseKey(data.licenseKey)
        setPlan(data.plan)
        setStatus('found')
        return
      }

      // No paid key — issue a free key
      const freeRes = await fetch('/api/issue-free-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const freeData = await freeRes.json()
      if (freeRes.ok && freeData.licenseKey) {
        setLicenseKey(freeData.licenseKey)
        setPlan('free')
        setStatus('found')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  const handleCopy = async () => {
    if (!licenseKey) return
    try {
      await navigator.clipboard.writeText(licenseKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-emerald-500/10 p-3 rounded-full">
              <Key className="h-8 w-8 text-emerald-500" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Get Your API Key</h1>
          <p className="text-muted-foreground text-sm">
            Enter your email — we&apos;ll find your paid key or issue a free one instantly.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Look up by email</CardTitle>
            <CardDescription>Paid subscribers get their key; everyone else gets a free key</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={status === 'loading'}
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600" disabled={status === 'loading'}>
                {status === 'loading' ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Looking up…</>
                ) : 'Find my key'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Found */}
        {status === 'found' && licenseKey && (
          <Card className="border-emerald-500/30 bg-emerald-50/5">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="h-5 w-5" />
                {plan === 'free' ? 'Your free API key is ready' : `Found your ${plan} subscription`}
              </div>
              <div className="flex gap-2">
                <code className="flex-1 bg-muted/50 border border-muted p-3 rounded-lg text-sm font-mono break-all">
                  {licenseKey}
                </code>
                <Button variant="outline" size="sm" className="shrink-0 self-start mt-1" onClick={handleCopy}>
                  {copied ? <><CheckCircle2 className="h-4 w-4 mr-1 text-emerald-400" />Copied</> : <><Copy className="h-4 w-4 mr-1" />Copy</>}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use with: <code className="font-mono">npx speclint-cli --key {licenseKey.slice(0, 12)}…</code>
              </p>
              {plan === 'free' && (
                <p className="text-xs text-muted-foreground border-t border-border/30 pt-3">
                  Free tier: 5 items/request, 3 requests/day.{' '}
                  <Link href="/pricing" className="text-emerald-400 hover:underline">Upgrade for more →</Link>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {status === 'error' && (
          <p className="text-center text-sm text-red-400">
            Something went wrong. Try again or email{' '}
            <a href="mailto:support@speclint.ai" className="underline">support@speclint.ai</a>.
          </p>
        )}

        <div className="text-center">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
