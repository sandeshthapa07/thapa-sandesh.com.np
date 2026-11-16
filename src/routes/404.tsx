import { createFileRoute } from "@tanstack/react-router"
import { NotFound } from "@/components/not-found"
import { site } from "@/content/site"

// Prerendered to 404.html, which Cloudflare serves for any unknown path.
export const Route = createFileRoute("/404")({
  head: () => ({
    meta: [
      { title: `Page not found | ${site.name}` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotFound,
})
