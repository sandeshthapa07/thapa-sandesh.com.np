// Posts are Markdown files in src/content/posts, compiled at build time by
// plugins/markdown.ts.

export type PostMeta = {
  slug: string
  title: string
  description: string
  /** Published, YYYY-MM-DD. */
  date: string
  /** Last substantive edit, YYYY-MM-DD. Leave out until the post changes. */
  updated?: string
  tags: string[]
  readingMinutes: number
}

const metas = import.meta.glob<PostMeta>("../content/posts/*.md", {
  query: "?meta",
  import: "meta",
  eager: true,
})

const bodies = import.meta.glob<string>("../content/posts/*.md", {
  import: "html",
})

export const posts = Object.values(metas).sort((a, b) =>
  b.date.localeCompare(a.date)
)

export async function loadPost(slug: string) {
  const meta = posts.find((post) => post.slug === slug)
  const load = bodies[`../content/posts/${slug}.md`] as
    (() => Promise<string>) | undefined
  if (!meta || !load) return null
  return { ...meta, html: await load() }
}

export function formatDate(date: string, month: "short" | "long" = "short") {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month,
    day: "numeric",
    timeZone: "UTC",
  })
}
