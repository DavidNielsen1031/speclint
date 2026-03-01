import Link from 'next/link'
import { getAllPosts } from '@/lib/blog'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog — Speclint',
  description: 'Thoughts on spec quality, AI-native development, and building better agent pipelines.',
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export default function BlogIndex() {
  const posts = getAllPosts()

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-mono font-bold text-white text-lg hover:text-emerald-400 transition-colors">
            speclint
          </Link>
          <nav className="flex items-center gap-6 text-sm font-mono">
            <Link href="/pricing" className="text-zinc-400 hover:text-zinc-100 transition-colors">pricing</Link>
            <Link href="/blog" className="text-emerald-400">blog</Link>
            <Link href="/get-key" className="bg-emerald-500 hover:bg-emerald-400 text-black px-3 py-1.5 rounded transition-colors font-semibold">
              get key
            </Link>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">Blog</h1>
          <p className="text-zinc-400 text-lg">
            Thoughts on spec quality, AI-native development, and building better agent pipelines.
          </p>
        </div>

        <div className="space-y-px">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block group"
            >
              <article className="border border-zinc-800 rounded-lg p-6 hover:border-zinc-600 hover:bg-zinc-900/50 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold text-white group-hover:text-emerald-400 transition-colors mb-2 leading-snug">
                      {post.title}
                    </h2>
                    <p className="text-zinc-400 text-sm leading-relaxed line-clamp-2">
                      {post.description}
                    </p>
                  </div>
                  <span className="text-zinc-500 text-sm font-mono whitespace-nowrap mt-1 shrink-0">
                    {formatDate(post.date)}
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
