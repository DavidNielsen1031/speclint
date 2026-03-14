import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllPosts, getPostBySlug, markdownToHtml } from '@/lib/blog'
import { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const posts = getAllPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}
  return {
    title: `${post.title} | Speclint Blog`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
    },
  }
}

function estimateReadingTime(content: string): number {
  return Math.ceil(content.split(/\s+/).length / 200)
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

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const html = markdownToHtml(post.content)

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
            <Link href="/blog" className="text-zinc-400 hover:text-zinc-100 transition-colors">blog</Link>
            <Link href="/get-key" className="bg-emerald-500 hover:bg-emerald-400 text-black px-3 py-1.5 rounded transition-colors font-semibold">
              get key
            </Link>
          </nav>
        </div>
      </div>

      {/* Article */}
      <div className="mx-auto max-w-3xl px-6 py-16">
        {/* Back link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm font-mono mb-10 transition-colors"
        >
          ← back to blog
        </Link>

        {/* Post header */}
        <header className="mb-10 pb-8 border-b border-zinc-800">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            {post.title}
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed mb-6">
            {post.description}
          </p>
          <div className="flex items-center gap-4 text-sm text-zinc-500 font-mono">
            <span>{post.author}</span>
            <span>·</span>
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            <span>·</span>
            <span>{estimateReadingTime(post.content)} min read</span>
          </div>
        </header>

        {/* Post body */}
        <div
          className="text-zinc-300 leading-relaxed [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mt-8 [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-white [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:my-4 [&_p]:leading-7 [&_ul]:my-4 [&_ol]:my-4 [&_li]:leading-7 [&_pre]:my-6 [&_a]:text-emerald-400 [&_a:hover]:text-emerald-300 [&_hr]:border-zinc-800 [&_hr]:my-8 [&_strong]:text-zinc-100 [&_strong]:font-semibold"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Social sharing */}
        <div className="flex gap-4 mt-8 pt-4 border-t border-zinc-800">
          <a
            href={`https://x.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`https://speclint.ai/blog/${post.slug}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-500 hover:text-zinc-100 font-mono transition-colors"
          >
            Share on X
          </a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://speclint.ai/blog/${post.slug}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-500 hover:text-zinc-100 font-mono transition-colors"
          >
            Share on LinkedIn
          </a>
        </div>

        {/* CTA */}
        <div className="mt-12 p-6 bg-[#111] border border-zinc-800 rounded-lg text-center">
          <p className="text-white font-semibold text-lg mb-2">Ready to lint your specs?</p>
          <p className="text-zinc-400 text-sm mb-4">Catch vague tickets before your agents do.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/#try-it"
              className="inline-block px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm rounded-lg transition-colors"
            >
              Try Speclint free →
            </a>
            <a
              href="/get-key"
              className="inline-block px-5 py-2.5 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white font-semibold text-sm rounded-lg transition-colors"
            >
              Get your API key
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
