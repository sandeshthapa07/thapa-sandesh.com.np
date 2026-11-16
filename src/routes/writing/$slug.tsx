import { Link, createFileRoute, notFound } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { site } from "@/content/site"
import { formatDate, loadPost } from "@/lib/posts"
import { pageTitle, seo } from "@/lib/seo"
import { postSchema } from "@/lib/structured-data"

export const Route = createFileRoute("/writing/$slug")({
  loader: async ({ params }) => {
    const post = await loadPost(params.slug)
    if (!post) throw notFound()
    return post
  },
  head: ({ loaderData: post }) =>
    post
      ? seo({
          title: pageTitle(post.title),
          description: post.description,
          path: `/writing/${post.slug}`,
          article: { publishedTime: post.date, modifiedTime: post.updated },
          jsonLd: postSchema(post),
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
            {post.updated && (
              <>
                {" · Updated "}
                <time dateTime={post.updated}>
                  {formatDate(post.updated, "long")}
                </time>
              </>
            )}
            {" · "}
            {post.readingMinutes} min read
          </p>
          <h1 className="mt-4 text-3xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-[40px]">
            {post.title}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-pretty text-fg-2">
            {post.description}
          </p>
          <div className="mt-6 flex items-center gap-3">
            <img
              src="/me.jpg"
              alt=""
              width={36}
              height={36}
              className="size-9 rounded-full object-cover"
            />
            <p className="text-sm leading-snug">
              <Link
                to="/"
                rel="author"
                className="font-medium underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-yellow-deep"
              >
                {site.name}
              </Link>
              <span className="block text-xs text-fg-3">
                {site.role} at {site.company}
              </span>
            </p>
          </div>
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
