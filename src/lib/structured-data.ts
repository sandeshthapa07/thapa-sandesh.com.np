// Schema.org nodes (JSON-LD) that tell search engines and AI assistants who
// runs this site and what each page is. Passed to seo({ jsonLd }).

import { site } from "@/content/site"
import type { PostMeta } from "@/lib/posts"
import { absoluteUrl } from "@/lib/seo"
import type { JsonLd } from "@/lib/seo"

const home = absoluteUrl("/")
const ids = {
  person: `${home}#person`,
  website: `${home}#website`,
  blog: `${absoluteUrl("/writing")}#blog`,
}

/** Enough of the person for an author field to stand on its own. */
const author = {
  "@type": "Person",
  "@id": ids.person,
  name: site.name,
  url: home,
}

const person: JsonLd = {
  ...author,
  image: absoluteUrl("/me.jpg"),
  jobTitle: site.role,
  description: site.description,
  worksFor: {
    "@type": "Organization",
    name: site.company,
    url: site.companyUrl,
  },
  homeLocation: { "@type": "Country", name: site.location },
  sameAs: site.socials
    .map((social) => social.href)
    .filter((href) => href.startsWith("http")),
}

const website: JsonLd = {
  "@type": "WebSite",
  "@id": ids.website,
  url: home,
  name: site.name,
  description: site.description,
  inLanguage: "en",
  publisher: { "@id": ids.person },
}

function breadcrumbs(items: Array<{ name: string; path: string }>): JsonLd {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

const postUrl = (post: PostMeta) => absoluteUrl(`/writing/${post.slug}`)

export function homeSchema(): JsonLd[] {
  return [
    website,
    {
      "@type": "ProfilePage",
      "@id": `${home}#profile`,
      url: home,
      name: site.title,
      isPartOf: { "@id": ids.website },
      mainEntity: person,
    },
  ]
}

export function writingSchema({
  title,
  description,
  posts,
}: {
  title: string
  description: string
  posts: PostMeta[]
}): JsonLd[] {
  return [
    {
      "@type": "Blog",
      "@id": ids.blog,
      url: absoluteUrl("/writing"),
      name: title,
      description,
      inLanguage: "en",
      author,
      isPartOf: { "@id": ids.website },
      blogPost: posts.map((post) => ({
        "@type": "BlogPosting",
        headline: post.title,
        url: postUrl(post),
        datePublished: post.date,
        dateModified: post.updated ?? post.date,
      })),
    },
    breadcrumbs([
      { name: "Home", path: "/" },
      { name: "Writing", path: "/writing" },
    ]),
  ]
}

export function postSchema(post: PostMeta): JsonLd[] {
  const url = postUrl(post)
  return [
    {
      "@type": "BlogPosting",
      "@id": `${url}#article`,
      mainEntityOfPage: url,
      url,
      headline: post.title,
      description: post.description,
      image: absoluteUrl("/og.png"),
      datePublished: post.date,
      dateModified: post.updated ?? post.date,
      author,
      publisher: author,
      keywords: post.tags,
      inLanguage: "en",
      isPartOf: { "@id": ids.blog },
    },
    breadcrumbs([
      { name: "Home", path: "/" },
      { name: "Writing", path: "/writing" },
      { name: post.title, path: `/writing/${post.slug}` },
    ]),
  ]
}
