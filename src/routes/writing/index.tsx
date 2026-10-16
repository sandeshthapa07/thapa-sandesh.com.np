import { createFileRoute } from "@tanstack/react-router"
import { PostList } from "@/components/post-list"
import { Band, SectionTitle } from "@/components/section"
import { site } from "@/content/site"
import { posts } from "@/lib/posts"
import { seo } from "@/lib/seo"

export const Route = createFileRoute("/writing/")({
  head: () =>
    seo({
      title: `Writing — ${site.name}`,
      description:
        "Notes on what I learn and discover as a frontend developer.",
      path: "/writing",
    }),
  component: Writing,
})

function Writing() {
  return (
    <>
      <SectionTitle
        as="h1"
        kicker="Writing"
        title="Notes from the work"
        subtitle="What I learn and discover along the way"
        className="pt-16 pb-10 sm:pt-24"
      />
      <PostList posts={posts} />
      <Band />
      <Band />
    </>
  )
}
