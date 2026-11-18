import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { Marked } from "marked"
import { createHighlighter } from "shiki"
import type { Plugin } from "vite"

// Turns `posts/*.md` into JS modules at build time, so pages ship plain HTML
// and the highlighter never reaches the browser.
//   import { meta, html } from "./post.md"   -> metadata + rendered body
//   import { meta } from "./post.md?meta"    -> metadata only (for lists)
//   import { source } from "./post.md?source" -> Markdown body, no frontmatter

const THEMES = { light: "github-light", dark: "github-dark-default" } as const
const LANGS = [
  "ts",
  "tsx",
  "js",
  "jsx",
  "json",
  "css",
  "html",
  "bash",
  "dockerfile",
  "md",
]

export function markdown(): Plugin {
  let renderer: Promise<Marked> | undefined

  return {
    name: "site:markdown",
    enforce: "pre",
    async transform(source, id) {
      const [file, query] = id.split("?")
      if (!file.endsWith(".md")) return
      if (query && query !== "meta" && query !== "source") return

      const { data, body } = parseFrontmatter(source)
      if (query === "source") {
        const code = `export const source = ${JSON.stringify(body)};\n`
        return { code, map: null, moduleType: "js" }
      }
      const words = body.split(/\s+/).filter(Boolean).length
      const meta = {
        ...data,
        slug: file.split("/").pop()!.replace(/\.md$/, ""),
        readingMinutes: Math.max(1, Math.round(words / 220)),
      }

      let code = `export const meta = ${JSON.stringify(meta)};\n`
      if (!query) {
        renderer ??= createRenderer()
        const html = await (await renderer).parse(body)
        code += `export const html = ${JSON.stringify(html)};\n`
      }
      return { code, map: null, moduleType: "js" }
    },
  }
}

async function createRenderer() {
  const highlighter = await createHighlighter({
    themes: Object.values(THEMES),
    langs: LANGS,
  })

  return new Marked({
    renderer: {
      code({ text, lang = "" }) {
        // Fence info like: ts title="lib/posts.ts"
        //   or: jsx playground title="search.jsx" network="slow"
        const [language = "text", ...flags] = lang.split(/\s+/)
        const title = lang.match(/title="([^"]+)"/)?.[1]
        const highlighted = highlighter.codeToHtml(text, {
          lang: LANGS.includes(language) ? language : "text",
          themes: THEMES,
          defaultColor: false,
        })
        const caption = title
          ? `<figcaption>${escapeHtml(title)}</figcaption>`
          : ""
        const figure = `<figure class="code">${caption}${highlighted}</figure>`
        if (!flags.includes("playground")) return `${figure}\n`

        // The highlighted code stays as the no-JS version. On the client,
        // components/playground.tsx reads it from the <pre> and replaces it
        // with an editor and a live preview.
        const network = lang.match(/network="([^"]+)"/)?.[1] ?? "fast"
        return `<div class="playground" data-title="${escapeHtml(title ?? "App.jsx")}" data-network="${escapeHtml(network)}">${figure}</div>\n`
      },
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens)
        const id = text
          .replace(/<[^>]+>/g, "")
          // Drop escaped characters like &#39; so "it's" becomes "its".
          .replace(/&#?\w+;/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
        return `<h${depth} id="${id}">${text}</h${depth}>\n`
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens)
        const external = /^https?:\/\//.test(href)
        const attrs = [
          `href="${href}"`,
          title ? `title="${escapeHtml(title)}"` : "",
          external ? `target="_blank" rel="noreferrer"` : "",
        ]
        return `<a ${attrs.filter(Boolean).join(" ")}>${text}</a>`
      },
    },
  })
}

/**
 * Each post's slug and last-changed date (`updated`, else `date`), read
 * straight from disk so the build config can set sitemap <lastmod>.
 */
export function readPostDates(dir: string) {
  return readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const { data } = parseFrontmatter(
        readFileSync(path.join(dir, file), "utf8")
      )
      const lastmod = data.updated ?? data.date
      if (typeof lastmod !== "string") {
        throw new Error(`${file}: frontmatter needs a "date"`)
      }
      return { slug: file.replace(/\.md$/, ""), lastmod }
    })
}

// Frontmatter values are written as JSON (strings, arrays), so each line is
// `key: <json>`.
function parseFrontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!match) return { data: {}, body: source }

  const data: Record<string, unknown> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const index = line.indexOf(":")
    if (index === -1) continue
    const value = line.slice(index + 1).trim()
    try {
      data[line.slice(0, index).trim()] = JSON.parse(value)
    } catch {
      data[line.slice(0, index).trim()] = value
    }
  }
  return { data, body: source.slice(match[0].length) }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;")
}
