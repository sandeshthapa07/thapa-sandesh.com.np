import { Link, createFileRoute, notFound } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { site } from "@/content/site"
import { formatDate, loadPost } from "@/lib/posts"
import { seo } from "@/lib/seo"

export const Route = createFileRoute("/writing/$slug")({
  loader: async ({ params }) => {
    const post = await loadPost(params.slug)
    if (!post) throw notFound()
    return post
  },
  head: ({ loaderData }) =>
    loaderData
      ? seo({
          title: `${loaderData.title} — ${site.name}`,
          description: loaderData.description,
          path: `/writing/${loaderData.slug}`,
          type: "article",
        })
      : {},
  component: Post,
})

function Post() {
  const post = Route.useLoaderData()

  return (
    <>
      <article className="mx-auto max-w-[720px] px-2 pt-10 pb-20 sm:px-5 sm:pt-16">
        <Link
          to="/writing"
          className="inline-flex items-center gap-1.5 text-sm text-fg-3 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Writing
        </Link>
        <header className="mt-10 border-b border-line pb-10">
          <p className="font-mono text-xs text-fg-3 tabular-nums">
            <time dateTime={post.date}>{formatDate(post.date, "long")}</time>
            {" · "}
            {post.readingMinutes} min read
          </p>
          <h1 className="mt-4 text-3xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-[40px]">
            {post.title}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-pretty text-fg-2">
            {post.description}
          </p>
          <ul className="mt-6 flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-panel px-2.5 py-0.5 font-mono text-[11px] text-fg-3"
              >
                {tag}
              </li>
            ))}
          </ul>
        </header>
        <div
          className="prose mt-10"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />
      </article>
    </>
  )
}
