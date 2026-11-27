import { createFileRoute } from "@tanstack/react-router"
import { projects, sideProjects } from "@/content/projects"
import { site } from "@/content/site"
import { posts } from "@/lib/posts"
import { absoluteUrl } from "@/lib/seo"

// /llms.txt (https://llmstxt.org): a Markdown map of the site for AI agents
// and assistants. It's built from the same content as the pages, so a new
// post or project appears here on the next build without editing this file.
// The build prerenders it to a static file, like every other page.

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(llmsTxt(), {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }),
    },
  },
})

function llmsTxt() {
  const writing = posts.map((post) => {
    const updated = post.updated ? `, updated ${post.updated}` : ""
    const url = absoluteUrl(`/writing/${post.slug}`)
    return `- ${link(post.title, url)}: ${post.description} (Published ${post.date}${updated}.)`
  })

  const work = projects.map(
    (project) =>
      `- ${link(project.title, project.href)}: ${project.description}`
  )

  const sideWork = sideProjects.map((project) => {
    const source = project.source
      ? ` Source: ${link("GitHub", project.source)}.`
      : ""
    return `- ${link(project.title, project.href)} (${project.kind}): ${project.summary} ${project.why}${source}`
  })

  const contact = site.socials.map(
    (social) => `- ${link(social.label, social.href)}`
  )

  return (
    [
      `# ${site.name}`,
      `> ${site.description}`,
      `Personal site of ${site.name}, ${site.role.toLowerCase()} at ${link(site.company, site.companyUrl)}, based in ${site.location}: articles from day-to-day frontend work, and the products built along the way. Every page is prerendered HTML, so the links below can be read without running JavaScript.`,
      `## Writing\n\n${writing.join("\n")}`,
      `## Projects\n\n${work.join("\n")}`,
      `## Side projects and packages\n\n${sideWork.join("\n")}`,
      `## Contact\n\n${contact.join("\n")}`,
      [
        "## Optional",
        "",
        `- ${link("Home", absoluteUrl("/"))}: About, projects, side projects and toolkit.`,
        `- ${link("All writing", absoluteUrl("/writing"))}: Every article, newest first.`,
        `- ${link("Full text", absoluteUrl("/llms-full.txt"))}: Every article in full, in one Markdown file.`,
        `- ${link("Sitemap", absoluteUrl("/sitemap.xml"))}: Every page, with the date it last changed.`,
      ].join("\n"),
    ].join("\n\n") + "\n"
  )
}

/** A Markdown link, with brackets in the text escaped so they can't end it early. */
function link(text: string, href: string) {
  return `[${text.replace(/[[\]]/g, "\\$&")}](${href})`
}
