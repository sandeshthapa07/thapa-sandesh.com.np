import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { markdown, readPostDates } from "./plugins/markdown.ts"
import { site } from "./src/content/site.ts"

// Sitemap <lastmod> must be when a page last changed, not the build date
// (TanStack's default), or search engines learn to ignore it.
const posts = readPostDates(
  fileURLToPath(new URL("./src/content/posts", import.meta.url))
)
const newestPost = posts
  .map((post) => post.lastmod)
  .sort()
  .at(-1)

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    markdown(),
    tailwindcss(),
    tanstackStart({
      // Every page is static, so build it all to HTML.
      prerender: {
        enabled: true,
        crawlLinks: true,
        // Route discovery also yields "/writing/"; keep only the canonical URL.
        filter: ({ path }) => path === "/" || !path.endsWith("/"),
      },
      // Cloudflare serves 404.html for any path that has no page.
      pages: [
        {
          path: "/404",
          prerender: { outputPath: "/404.html" },
          sitemap: { exclude: true },
        },
        // Index route alias of /writing; skipped by the filter above.
        { path: "/writing/", sitemap: { exclude: true } },
        { path: "/writing", sitemap: { lastmod: newestPost } },
        ...posts.map((post) => ({
          path: `/writing/${post.slug}`,
          sitemap: { lastmod: post.lastmod },
        })),
        // Files for AI agents. No page links to them, so the crawl would miss
        // them, and they aren't pages for search results, so no sitemap.
        { path: "/llms.txt", sitemap: { exclude: true } },
        { path: "/llms-full.txt", sitemap: { exclude: true } },
      ],
      sitemap: { host: site.url },
    }),
    viteReact(),
  ],
})

export default config
