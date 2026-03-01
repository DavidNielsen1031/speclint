"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { siteConfig } from "@/config/site"
import { ArrowRight, Sparkles } from "lucide-react"
import Link from "next/link"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="flex justify-center mb-8">
            <Badge 
              variant="secondary" 
              className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 text-sm font-medium px-4 py-2 animate-fade-in-up"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {siteConfig.hero.badge}
            </Badge>
          </div>

          <h1 className="text-hero font-space-grotesk bg-gradient-to-br from-white via-white to-white/70 bg-clip-text text-transparent mb-8 animate-fade-in-up animate-stagger-delay-1">
            {siteConfig.hero.title}
          </h1>

          <p className="text-xl sm:text-2xl text-muted-foreground leading-8 mb-12 max-w-2xl mx-auto animate-fade-in-up animate-stagger-delay-2">
            {siteConfig.hero.subtitle}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up animate-stagger-delay-3">
            <Button 
              size="lg" 
              asChild
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-3 h-auto text-lg group"
            >
              <Link href={siteConfig.hero.cta.href}>
                {siteConfig.hero.cta.text}
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              asChild
              className="border-white/20 text-white hover:bg-white/10 font-semibold px-8 py-3 h-auto text-lg"
            >
              <Link href={siteConfig.hero.secondaryCta.href}>
                {siteConfig.hero.secondaryCta.text}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-emerald-500/3 rounded-full blur-3xl" />
      </div>
    </section>
  )
}
