import fs from 'fs'
import path from 'path'

export interface BlogPost {
  slug: string
  title: string
  date: string
  author: string
  description: string
  content: string
}

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

function parseFrontmatter(raw: string): { data: Record<string, string>; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!match) return { data: {}, content: raw }

  const data: Record<string, string> = {}
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '')
    if (key) data[key] = value
  }

  return { data, content: match[2] }
}

export function markdownToHtml(md: string): string {
  let html = md
    // Escape HTML entities first (but not in code blocks)
    // Handle fenced code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
      const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      const langClass = lang ? ` class="language-${lang}"` : ''
      return `<pre class="bg-zinc-900 rounded-lg p-4 overflow-x-auto my-6 text-sm"><code${langClass}>${escaped}</code></pre>`
    })
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-zinc-800 text-emerald-400 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="border-zinc-800 my-8" />')
    // Headings
    .replace(/^#### (.+)$/gm, '<h4 class="text-lg font-bold text-white mt-6 mb-2">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="text-xl font-bold text-white mt-8 mb-3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold text-white mt-10 mb-4">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold text-white mt-8 mb-4">$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-zinc-100 font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-zinc-300">$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors">$1</a>')
    // Unordered lists
    .replace(/^([-*] .+(\n[-*] .+)*)/gm, (block) => {
      const items = block.split('\n').map(l => `<li class="ml-4 list-disc">${l.replace(/^[-*] /, '')}</li>`).join('\n')
      return `<ul class="space-y-1 my-4 text-zinc-300">\n${items}\n</ul>`
    })
    // Ordered lists
    .replace(/^(\d+\. .+(\n\d+\. .+)*)/gm, (block) => {
      const items = block.split('\n').map(l => `<li class="ml-4 list-decimal">${l.replace(/^\d+\. /, '')}</li>`).join('\n')
      return `<ol class="space-y-1 my-4 text-zinc-300">\n${items}\n</ol>`
    })
    // Paragraphs — wrap non-empty lines not already wrapped in a block element
    .replace(/^(?!<[hupoa]|<pre|<hr|<block)(.+)$/gm, '<p class="text-zinc-300 leading-relaxed my-4">$1</p>')
    // Clean up empty paragraphs
    .replace(/<p[^>]*>\s*<\/p>/g, '')

  return html
}

export function getAllPosts(): BlogPost[] {
  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'))
  const posts = files.map(filename => {
    const raw = fs.readFileSync(path.join(BLOG_DIR, filename), 'utf-8')
    const { data, content } = parseFrontmatter(raw)
    return {
      slug: data.slug || filename.replace('.md', ''),
      title: data.title || 'Untitled',
      date: data.date || '',
      author: data.author || 'Speclint Team',
      description: data.description || '',
      content,
    }
  })
  // Sort by date descending
  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function getPostBySlug(slug: string): BlogPost | null {
  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'))
  for (const filename of files) {
    const raw = fs.readFileSync(path.join(BLOG_DIR, filename), 'utf-8')
    const { data, content } = parseFrontmatter(raw)
    const postSlug = data.slug || filename.replace('.md', '')
    if (postSlug === slug) {
      return {
        slug: postSlug,
        title: data.title || 'Untitled',
        date: data.date || '',
        author: data.author || 'Speclint Team',
        description: data.description || '',
        content,
      }
    }
  }
  return null
}
