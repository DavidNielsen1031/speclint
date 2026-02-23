"use client"

import { useState } from "react"
import { track } from '@vercel/analytics'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { siteConfig } from "@/config/site"
import { Check, Star, Loader2 } from "lucide-react"

export function PricingSection() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  const scrollToRefiner = () => {
    document.getElementById('refiner')?.scrollIntoView({ 
      behavior: 'smooth' 
    })
  }

  const handleCheckout = async (plan: 'pro' | 'team') => {
    setLoadingPlan(plan)
    
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan,
          priceId: plan === 'pro' ? 'price_pro' : 'price_team'
        }),
      })

      const data = await response.json()

      if (response.ok && data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url
      } else {
        throw new Error(data.error || 'Failed to create checkout session')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Something went wrong. Please try again or contact support.')
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <section className="py-24 sm:py-32 bg-muted/30">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center mb-16">
          <h2 className="text-section-title font-space-grotesk mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground">
            Start free, upgrade when you need more. No hidden fees, cancel anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {siteConfig.pricing.map((plan, index) => (
            <Card 
              key={index}
              className={`border-border/50 backdrop-blur relative ${
                plan.popular 
                  ? 'border-emerald-500/50 bg-card/80 ring-2 ring-emerald-500/20' 
                  : 'bg-card/30'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-emerald-500 text-white px-4 py-1">
                    <Star className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">
                    ${plan.price}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-muted-foreground">/month</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {plan.description}
                </p>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start space-x-3">
                      <Check className="h-5 w-5 text-emerald-accent flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className={`w-full ${
                    plan.popular
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                  onClick={
                    plan.name === 'Free' 
                      ? scrollToRefiner 
                      : plan.name === 'Pro'
                      ? () => handleCheckout('pro')
                      : plan.name === 'Team'
                      ? () => handleCheckout('team')
                      : undefined
                  }
                  disabled={loadingPlan !== null}
                >
                  {loadingPlan === plan.name.toLowerCase() && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {plan.cta}
                </Button>
                
                {plan.name === 'Free' && (
                  <p className="text-xs text-center text-muted-foreground">
                    No signup required • Start immediately
                  </p>
                )}
                
                {plan.name === 'Pro' && (
                  <p className="text-xs text-center text-muted-foreground">
                    Instant access • Cancel anytime
                  </p>
                )}
                
                {plan.name === 'Team' && (
                  <p className="text-xs text-center text-muted-foreground">
                    Enterprise features • Custom pricing
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground text-sm">
            All plans include data privacy protection and secure processing. 
            <br />
            <span className="text-emerald-400">No long-term contracts</span> • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  )
}