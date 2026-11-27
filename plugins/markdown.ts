import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { Marked } from "marked"
import { createHighlighter } from "shiki"
import type { TokenizerAndRendererExtension } from "marked"
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
        const html = renderPost(await renderer, body)
        code += `export const html = ${JSON.stringify(html)};\n`
      }
      return { code, map: null, moduleType: "js" }
    },
  }
}

// Footnotes for the post being rendered. Definitions are collected while the
// blocks are read, and numbers are handed out in the order the references
// appear. renderPost resets this, and rendering is synchronous, so posts
// rendered side by side can't mix their notes.
let notes = { defs: new Map<string, string>(), order: [] as Array<string> }

function renderPost(marked: Marked, body: string) {
  notes = { defs: new Map(), order: [] }
  const html = marked.parse(body, { async: false })
  return html + footnotesSection(marked)
}

// The list at the end of a post, after everything else. The markup follows
// GitHub's: numbered links to each note, and a link back from each note.
function footnotesSection(marked: Marked) {
  if (!notes.order.length) return ""
  const items = notes.order.map((id, index) => {
    const text = marked.parseInline(notes.defs.get(id) ?? "", { async: false })
    // U+FE0E keeps ↩ as text instead of an emoji on iOS.
    const back = `<a href="#fnref-${id}" class="fn-back" aria-label="Back to reference ${index + 1}">↩︎</a>`
    return `<li id="fn-${id}">${text} ${back}</li>`
  })
  return [
    `<section class="footnotes" aria-labelledby="footnotes-label">`,
    `<h2 id="footnotes-label"><span>Footnotes</span></h2>`,
    `<ol>\n${items.join("\n")}\n</ol>`,
    `</section>\n`,
  ].join("\n")
}

const footnoteId = (label: string) =>
  label.toLowerCase().replace(/[^a-z0-9]+/g, "-")

// [^id]: Text of the note. It may wrap onto following lines, and ends at a
// blank line or the next definition. Renders nothing where it stands.
const footnoteDefinition: TokenizerAndRendererExtension = {
  name: "footnoteDefinition",
  level: "block",
  start: (src) => src.match(/^\[\^[^\]\s]+\]:/m)?.index,
  tokenizer(src) {
    const match =
      /^\[\^([^\]\s]+)\]:[ \t]+([^\n]*(?:\n(?![ \t]*(?:\n|$)|\[\^)[^\n]*)*)\n*/.exec(
        src
      )
    if (!match) return undefined
    notes.defs.set(footnoteId(match[1]), match[2].replace(/\s*\n\s*/g, " "))
    return { type: "footnoteDefinition", raw: match[0] }
  },
  renderer: () => "",
}

// [^id] in the text: a small number that links to the note.
const footnoteReference: TokenizerAndRendererExtension = {
  name: "footnoteReference",
  level: "inline",
  start: (src) => src.indexOf("[^"),
  tokenizer(src) {
    const match = /^\[\^([^\]\s]+)\](?!:)/.exec(src)
    if (!match || !notes.defs.has(footnoteId(match[1]))) return undefined
    return {
      type: "footnoteReference",
      raw: match[0],
      id: footnoteId(match[1]),
    }
  },
  renderer(token) {
    const id = token.id as string
    const seen = notes.order.includes(id)
    const number = seen ? notes.order.indexOf(id) + 1 : notes.order.push(id)
    // Only the first reference gets the id the note links back to.
    const anchor = seen ? "" : ` id="fnref-${id}"`
    return `<sup class="fn-ref"><a href="#fn-${id}"${anchor} aria-describedby="footnotes-label">${number}</a></sup>`
  },
}

// {>> A short aside <<} at the end of a paragraph or list item. Wide screens
// show it in the margin beside its paragraph, narrow ones under it. The
// hidden label tells screen readers what it is, since they read it inline.
const marginNote: TokenizerAndRendererExtension = {
  name: "marginNote",
  level: "inline",
  start: (src) => src.indexOf("{>>"),
  tokenizer(src) {
    const match = /^\{>>\s*([\s\S]+?)\s*<<\}/.exec(src)
    if (!match) return undefined
    return {
      type: "marginNote",
      raw: match[0],
      tokens: this.lexer.inlineTokens(match[1]),
    }
  },
  renderer(token) {
    const text = this.parser.parseInline(token.tokens ?? [])
    return `<span class="margin-note"><span class="visually-hidden">Side note: </span><span class="margin-note-text">${text}</span></span>`
  },
}

async function createRenderer() {
  const highlighter = await createHighlighter({
    themes: Object.values(THEMES),
    langs: LANGS,
  })

  return new Marked({
    extensions: [footnoteDefinition, footnoteReference, marginNote],
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
        // The span keeps the heading's text together, so section headings
        // can draw a rule beside it (styles.css).
        return `<h${depth} id="${id}"><span>${text}</span></h${depth}>\n`
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
