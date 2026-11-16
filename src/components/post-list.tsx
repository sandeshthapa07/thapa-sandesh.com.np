import { usePostHog } from "@posthog/react"
import { Link } from "@tanstack/react-router"
import { ArrowUpRight } from "lucide-react"
import { formatDate } from "@/lib/posts"
import type { PostMeta } from "@/lib/posts"

export function PostList({ posts }: { posts: PostMeta[] }) {
  const posthog = usePostHog()

  return (
    <ul className="mx-auto max-w-[720px] overflow-hidden rounded-[18px] bg-panel">
      {posts.map((post) => (
        <li key={post.slug} className="border-line not-first:border-t">
          <Link
            to="/writing/$slug"
            params={{ slug: post.slug }}
            onClick={() =>
              posthog.capture("writing_post_opened", { post_slug: post.slug })
            }
            className="group flex items-start justify-between gap-6 px-6 py-5 transition-colors outline-none hover:bg-panel-2 focus-visible:bg-panel-2"
          >
            <div className="min-w-0">
              <h3 className="flex items-center gap-1.5 text-sm font-medium">
                {post.title}
                <ArrowUpRight className="size-3.5 shrink-0 text-fg-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
              </h3>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-fg-3">
                {post.description}
              </p>
            </div>
            <time
              dateTime={post.date}
              className="shrink-0 pt-0.5 font-mono text-xs text-fg-3 tabular-nums"
            >
              {formatDate(post.date)}
            </time>
          </Link>
        </li>
      ))}
    </ul>
  )
}
