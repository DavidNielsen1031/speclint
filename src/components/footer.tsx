"use client"

import { Separator } from "@/components/ui/separator"
import { siteConfig } from "@/config/site"
import { Twitter, Github, Heart } from "lucide-react"

const iconMap = {
  Twitter,
  GitHub: Github
}

export function Footer() {
  return (
    <footer className="bg-card/30 border-t border-border/50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold text-emerald-400 mb-3">
              {siteConfig.name}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
              {siteConfig.description}
            </p>
            <div className="flex space-x-4 mt-4">
              {siteConfig.footer.social.map((social, index) => {
                const Icon = iconMap[social.icon as keyof typeof iconMap]
                return Icon ? (
                  <a
                    key={index}
                    href={social.href}
                    className="text-muted-foreground hover:text-emerald-400 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon className="h-5 w-5" />
                    <span className="sr-only">{social.name}</span>
                  </a>
                ) : null
              })}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Legal</h4>
            <ul className="space-y-2">
              {siteConfig.footer.links.map((link, index) => (
                <li key={index}>
                  <a 
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-emerald-400 transition-colors"
                  >
                    {link.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Product</h4>
            <ul className="space-y-2">
              <li>
                <a 
                  href="#refiner"
                  className="text-sm text-muted-foreground hover:text-emerald-400 transition-colors"
                  onClick={(e) => {
                    e.preventDefault()
                    document.getElementById('refiner')?.scrollIntoView({ 
                      behavior: 'smooth' 
                    })
                  }}
                >
                  Lint a Spec
                </a>
              </li>
              <li>
                <a 
                  href="#example"
                  className="text-sm text-muted-foreground hover:text-emerald-400 transition-colors"
                  onClick={(e) => {
                    e.preventDefault()
                    document.getElementById('example')?.scrollIntoView({ 
                      behavior: 'smooth' 
                    })
                  }}
                >
                  View Example
                </a>
              </li>
              <li>
                <a 
                  href="/blog"
                  className="text-sm text-muted-foreground hover:text-emerald-400 transition-colors"
                >
                  Blog
                </a>
              </li>
              <li>
                <a
                  href="/openapi.yaml"
                  className="text-sm text-muted-foreground hover:text-emerald-400 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  API Spec (OpenAPI)
                </a>
              </li>
              <li>
                <a
                  href="/llms.txt"
                  className="text-sm text-muted-foreground hover:text-emerald-400 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  For AI Agents (llms.txt)
                </a>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8 bg-border/50" />

        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Alexander Fund. All rights reserved.
          </p>
          
          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
            <span>Built with</span>
            <Heart className="h-4 w-4 text-red-400" />
            <span>for AI dev teams</span>
          </div>
        </div>
      </div>
    </footer>
  )
}