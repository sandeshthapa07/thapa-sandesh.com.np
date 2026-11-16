import { createFileRoute } from "@tanstack/react-router"
import { PostList } from "@/components/post-list"
import { Band, SectionTitle } from "@/components/section"
import { posts } from "@/lib/posts"
import { pageTitle, seo } from "@/lib/seo"
import { writingSchema } from "@/lib/structured-data"

const title = "Writing on React, Next.js, CSS and animation"
const description =
  "Notes from my work as a frontend developer in Nepal: React, Next.js, CSS and animation. What I learn and discover while building interfaces for the web."

export const Route = createFileRoute("/writing/")({
  head: () =>
    seo({
      title: pageTitle(title),
      description,
      path: "/writing",
      jsonLd: writingSchema({ title, description, posts }),
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
