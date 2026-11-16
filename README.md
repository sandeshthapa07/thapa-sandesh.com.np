# thapa-sandesh.com.np

Personal site of Sandesh Thapa. TanStack Start, React, Tailwind CSS v4.
Every page is pre-rendered to static HTML at build time.

## Develop

```bash
pnpm dev        # http://localhost:3000
pnpm build      # static pages + sitemap in dist/client
pnpm typecheck && pnpm lint
pnpm run deploy # build, then upload dist/client to Cloudflare
```

## Hosting

Cloudflare Workers static assets, configured in `wrangler.jsonc`, on the
custom domain `thapa-sandesh.com.np`. There is no server code: Cloudflare
serves the prerendered files, drops trailing slashes to match the canonical
URLs, and serves `404.html` for unknown paths.

## Editing content

- `src/content/site.ts`: name, role, contact links
- `src/content/projects.ts`: project cards
- `src/content/toolkit.ts`: the toolkit grid
- `src/content/posts/*.md`: posts. Frontmatter values are JSON
  (`title: "..."`, `tags: ["a", "b"]`). Code fences accept a title:
  ```` ```ts title="file.ts" ````

Posts are compiled to HTML with syntax highlighting at build time by
`plugins/markdown.ts`.

## Design

Colours, fonts and spacing follow notemap.com: dark `#0e0e10` with
`#131316` panels, Geist, yellow `#fde047` accent. All tokens live at the top
of `src/styles.css`: light values on `:root`, dark ones in its
`@variant dark` block.

The theme follows the visitor's system preference. The header toggle stores
an override only while it differs from the system, and applies it through
`<meta name="color-scheme">` (`src/lib/theme.ts`), which the CSS maps onto
`color-scheme` and the `dark:` variant.
