import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Analytics } from '@vercel/analytics/react';
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "Speclint — Lint your tickets before agents touch them",
  description: "Speclint scores every GitHub issue before your AI coding agent sees it. Bad specs ship broken code. Good specs ship in one pass. Free tier available.",
  keywords: ["spec quality", "AI coding agents", "GitHub Action", "spec linting", "coding agent pipeline", "AI development", "spec completeness score", "agent-ready tickets"],
  authors: [{ name: "Perpetual Agility LLC" }],
  creator: "Perpetual Agility LLC",
  metadataBase: new URL("https://speclint.ai"),
  alternates: {
    canonical: "https://speclint.ai",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://speclint.ai",
    title: "Speclint — Lint your tickets before agents touch them",
    description: "Speclint scores every GitHub issue before your AI coding agent sees it. Bad specs ship broken code. Good specs ship in one pass.",
    siteName: "Speclint",
    images: [
      {
        url: "https://speclint.ai/og-image.png",
        width: 1200,
        height: 630,
        alt: "Speclint — Lint your tickets before agents touch them",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Speclint — Lint your tickets before agents touch them",
    description: "Speclint scores every GitHub issue before your AI coding agent sees it. Bad specs ship broken code.",
    creator: "@speclint",
    images: ["https://speclint.ai/og-image.png"],
  },
  other: {
    "author": "Perpetual Agility LLC",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "name": "Speclint",
      "description": "Spec quality gate for AI-native development teams. Scores every GitHub issue from 0-100 before coding agents touch them.",
      "applicationCategory": "DeveloperApplication",
      "operatingSystem": "Web",
      "url": "https://speclint.ai",
      "offers": [
        {
          "@type": "Offer",
          "name": "Free",
          "price": "0",
          "priceCurrency": "USD",
          "description": "5 items per request, 3 requests per day, no credit card required"
        },
        {
          "@type": "Offer",
          "name": "Solo",
          "price": "29",
          "priceCurrency": "USD",
          "billingIncrement": "month",
          "description": "Unlimited requests, 25 items per request, codebase_context"
        },
        {
          "@type": "Offer",
          "name": "Team",
          "price": "79",
          "priceCurrency": "USD",
          "billingIncrement": "month",
          "description": "Unlimited requests, 50 items per request, dependency mapping, SLA"
        }
      ]
    },
    {
      "@type": "Organization",
      "name": "Perpetual Agility LLC",
      "url": "https://speclint.ai"
    },
    {
      "@type": "WebSite",
      "name": "Speclint",
      "url": "https://speclint.ai"
    }
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
        <meta name="author" content="Perpetual Agility LLC" />
        <link rel="canonical" href="https://speclint.ai" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased bg-background text-foreground min-h-screen`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
