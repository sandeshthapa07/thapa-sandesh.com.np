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
of `src/styles.css`, with a light theme under `:root` and the default dark
theme under `.dark`.
