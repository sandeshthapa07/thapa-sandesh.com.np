import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { markdown } from "./plugins/markdown.ts"
import { site } from "./src/content/site.ts"

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
      ],
      sitemap: { host: site.url },
    }),
    viteReact(),
  ],
})

export default config
