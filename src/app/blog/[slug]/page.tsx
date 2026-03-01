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
    title: `${post.title} — Speclint Blog`,
    description: post.description,
  }
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
          </div>
        </header>

        {/* Post body */}
        <div
          className="text-zinc-300 leading-relaxed [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mt-8 [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-white [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:my-4 [&_p]:leading-7 [&_ul]:my-4 [&_ol]:my-4 [&_li]:leading-7 [&_pre]:my-6 [&_a]:text-emerald-400 [&_a:hover]:text-emerald-300 [&_hr]:border-zinc-800 [&_hr]:my-8 [&_strong]:text-zinc-100 [&_strong]:font-semibold"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </main>
  )
}
