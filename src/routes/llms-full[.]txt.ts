import { createFileRoute } from "@tanstack/react-router"
import { site } from "@/content/site"
import { posts } from "@/lib/posts"
import { absoluteUrl } from "@/lib/seo"

// /llms-full.txt: every article in full, in one Markdown file, for AI agents
// that want the writing without crawling each page. /llms.txt is the index.
// Like that file, it's rebuilt from the post sources on every build.

const sources = import.meta.glob<string>("../content/posts/*.md", {
  query: "?source",
  import: "source",
})

export const Route = createFileRoute("/llms-full.txt")({
  server: {
    handlers: {
      GET: async () =>
        new Response(await llmsFullTxt(), {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }),
    },
  },
})

async function llmsFullTxt() {
  const intro = [
    `# ${site.name}: every article in full`,
    `> ${site.description}`,
    `All ${posts.length} articles from ${absoluteUrl("/writing")}, newest first, as Markdown. The index of the whole site is at ${absoluteUrl("/llms.txt")}. Interactive figures and animations can't run here, so each one is described in square brackets instead.`,
  ].join("\n\n")

  const articles = await Promise.all(
    posts.map(async (post) => {
      const load = sources[`../content/posts/${post.slug}.md`] as
        (() => Promise<string>) | undefined
      if (!load) throw new Error(`No source for post "${post.slug}"`)
      const details = [
        `- URL: ${absoluteUrl(`/writing/${post.slug}`)}`,
        `- Published: ${post.date}`,
        ...(post.updated ? [`- Updated: ${post.updated}`] : []),
        `- Topics: ${post.tags.join(", ")}`,
      ]
      return [
        `# ${post.title}`,
        details.join("\n"),
        `> ${post.description}`,
        plainMarkdown(await load()).trim(),
      ].join("\n\n")
    })
  )

  return [intro, ...articles].join("\n\n---\n\n") + "\n"
}

const OPEN = String.fromCharCode(0xe000)
const CLOSE = String.fromCharCode(0xe001)
const MARKER = new RegExp(`${OPEN}(\\d+)${CLOSE}`, "g")

/**
 * A post's Markdown as an agent can use it: the site's interactive HTML
 * (figures, animations, drag controls, do/don't boxes) becomes text, and
 * root-relative links become absolute. Code, fenced or inline, is kept
 * exactly as written.
 */
function plainMarkdown(markdown: string) {
  // Code is swapped for numbered markers while the prose is rewritten, then
  // put back. The markers use private-use characters, which posts never contain.
  const code: string[] = []
  const hide = (match: string) => `${OPEN}${code.push(match) - 1}${CLOSE}`

  return (
    markdown
      .replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, hide)
      // Inline code may wrap onto the next line, but not across paragraphs.
      .replace(/(`+)(?:[^`\n]|\n(?!\n))+?\1/g, hide)
      .replace(
        /<figure class="explorable"[^>]*aria-label="([^"]*)"[^>]*><\/figure>/g,
        "[Interactive figure: $1]"
      )
      .replace(
        /<figure class="scene">[\s\S]*?<figcaption>([\s\S]*?)<\/figcaption>[\s\S]*?<\/figure>/g,
        "[Animation: $1]"
      )
      .replace(
        /<div class="compare">([\s\S]*?)\n<\/div>/g,
        (_, boxes: string) => compare(boxes)
      )
      .replace(/<span class="scrub"[^>]*><\/span>/g, "[adjustable value]")
      // Margin notes ({>> … <<}) read as asides.
      .replace(/\s*\{>>\s*([\s\S]+?)\s*<<\}/g, " (Side note: $1)")
      // Any other tag goes, its text stays. Autolinks like <https://…> don't
      // match, because a tag name can't be followed by ":".
      .replace(/<\/?[a-z][a-z0-9-]*(?:\s[^>]*)?\/?>/gi, "")
      .replace(
        /\]\((\/[^)\s]*)/g,
        (_, path: string) => `](${absoluteUrl(path)}`
      )
      .replace(/\n{3,}/g, "\n\n")
      .replace(MARKER, (_, index: string) => code[Number(index)])
  )
}

/** A do/don't box, as a two-item list. */
function compare(boxes: string) {
  return [...boxes.matchAll(/<div class="(do|dont)">([\s\S]*?)<\/div>/g)]
    .map(([, kind, box]) => {
      const label = squash(
        box.match(/<p class="label">([\s\S]*?)<\/p>/)?.[1] ?? ""
      )
      const text = squash(box.replace(/<p class="label">[\s\S]*?<\/p>/, ""))
      const lead = label
        ? `**${/[.!?]$/.test(label) ? label : `${label}.`}** `
        : ""
      return `- ${kind === "do" ? "Do" : "Don't"}: ${lead}${text}`
    })
    .join("\n")
}

/** HTML as one line of Markdown: <code> becomes backticks, other tags go. */
function squash(html: string) {
  return html
    .replace(/<code>([\s\S]*?)<\/code>/g, "`$1`")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
}
