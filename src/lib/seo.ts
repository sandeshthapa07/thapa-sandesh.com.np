import { site } from "@/content/site"

export type JsonLd = Record<string, unknown>

const TITLE_LIMIT = 60

const ogImage = {
  url: `${site.url}/og.png`,
  width: "1200",
  height: "630",
  alt: `${site.name}, ${site.role} at ${site.company}: interfaces that feel effortless.`,
}

export function absoluteUrl(path: string) {
  return new URL(path, site.url).href
}

/** Appends the site name, unless that would push the title past what search results show. */
export function pageTitle(title: string) {
  const full = `${title} | ${site.name}`
  return full.length <= TITLE_LIMIT ? full : title
}

export function seo({
  title,
  description,
  path,
  article,
  jsonLd,
}: {
  title: string
  description: string
  path: string
  /** Dates as YYYY-MM-DD. Marks the page as an article. */
  article?: { publishedTime: string; modifiedTime?: string }
  /** Schema.org nodes, combined into one @graph. */
  jsonLd?: JsonLd[]
}) {
  const url = absoluteUrl(path)

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { name: "author", content: site.name },
      { property: "og:type", content: article ? "article" : "website" },
      { property: "og:site_name", content: site.name },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:image", content: ogImage.url },
      { property: "og:image:width", content: ogImage.width },
      { property: "og:image:height", content: ogImage.height },
      { property: "og:image:alt", content: ogImage.alt },
      ...(article
        ? [
            {
              property: "article:published_time",
              content: article.publishedTime,
            },
            {
              property: "article:modified_time",
              content: article.modifiedTime ?? article.publishedTime,
            },
            { property: "article:author", content: absoluteUrl("/") },
          ]
        : []),
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: ogImage.url },
      { name: "twitter:image:alt", content: ogImage.alt },
      ...(jsonLd?.length
        ? [
            {
              "script:ld+json": {
                "@context": "https://schema.org",
                "@graph": jsonLd,
              },
            },
          ]
        : []),
    ],
    links: [{ rel: "canonical", href: url }],
  }
}
