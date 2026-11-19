import { Suspense, lazy, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Link, createFileRoute, notFound } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import type { PlaygroundProps } from "@/components/playground"
import { site } from "@/content/site"
import { formatDate, loadPost } from "@/lib/posts"
import { pageTitle, seo } from "@/lib/seo"
import { postSchema } from "@/lib/structured-data"

export const Route = createFileRoute("/writing/$slug")({
  loader: async ({ params }) => {
    const post = await loadPost(params.slug)
    if (!post) throw notFound()
    return post
  },
  head: ({ loaderData: post }) =>
    post
      ? seo({
          title: pageTitle(post.title),
          description: post.description,
          path: `/writing/${post.slug}`,
          article: { publishedTime: post.date, modifiedTime: post.updated },
          jsonLd: postSchema(post),
        })
      : {},
  component: Post,
})

function Post() {
  const post = Route.useLoaderData()

  return (
    <>
      <article className="mx-auto max-w-[720px] px-2 pt-10 pb-20 sm:px-5 sm:pt-16">
        <Link
          to="/writing"
          className="inline-flex items-center gap-1.5 text-sm text-fg-3 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Writing
        </Link>
        <header className="mt-10 border-b border-line pb-10">
          <p className="font-mono text-xs text-fg-3 tabular-nums">
            <time dateTime={post.date}>{formatDate(post.date, "long")}</time>
            {post.updated && (
              <>
                {" · Updated "}
                <time dateTime={post.updated}>
                  {formatDate(post.updated, "long")}
                </time>
              </>
            )}
            {" · "}
            {post.readingMinutes} min read
          </p>
          <h1 className="mt-4 text-3xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-[40px]">
            {post.title}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-pretty text-fg-2">
            {post.description}
          </p>
          <div className="mt-6 flex items-center gap-3">
            <img
              src="/me.jpg"
              alt=""
              width={36}
              height={36}
              className="size-9 rounded-full object-cover"
            />
            <p className="text-sm leading-snug">
              <Link
                to="/"
                rel="author"
                className="font-medium underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-yellow-deep"
              >
                {site.name}
              </Link>
              <span className="block text-xs text-fg-3">
                {site.role} at {site.company}
              </span>
            </p>
          </div>
          <ul className="mt-6 flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-panel px-2.5 py-0.5 font-mono text-[11px] text-fg-3"
              >
                {tag}
              </li>
            ))}
          </ul>
        </header>
        <PostBody key={post.slug} html={post.html} />
      </article>
    </>
  )
}

const SCENE_FONT =
  "https://fonts.googleapis.com/css2?family=Balsamiq+Sans:wght@400;700&display=swap"

// Loaded only on posts that contain a playground.
const Playground = lazy(() => import("@/components/playground"))

type PlaygroundSlot = PlaygroundProps & { node: HTMLElement }

function PostBody({ html }: { html: string }) {
  const body = useRef<HTMLDivElement>(null)
  const [slots, setSlots] = useState<Array<PlaygroundSlot>>([])

  // Playground fences render as highlighted code inside a .playground
  // element. After hydration, mount a live editor into each one; the static
  // code stays until it loads (see styles.css).
  useEffect(() => {
    const nodes = body.current?.querySelectorAll<HTMLElement>(".playground")
    setSlots(
      Array.from(nodes ?? [], (node) => ({
        node,
        code: node.querySelector("pre")?.textContent ?? "",
        title: node.dataset.title ?? "App.jsx",
        network: node.dataset.network,
      }))
    )
  }, [html])

  // Live figures (<figure class="explorable">) need the safis runtime, which
  // is big, so it loads only when the first figure comes near the viewport.
  useEffect(() => {
    const root = body.current
    const figures = root?.querySelectorAll("figure.explorable")
    if (!root || !figures?.length) return
    let unmount: (() => void) | undefined
    let cancelled = false
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        observer.disconnect()
        import("@/components/figures")
          .then(({ mountFigures }) => {
            if (!cancelled) unmount = mountFigures(root)
          })
          .catch((error: unknown) => {
            console.error("Couldn't load the figures", error)
          })
      },
      { rootMargin: "1000px 0px" }
    )
    figures.forEach((figure) => observer.observe(figure))
    return () => {
      cancelled = true
      observer.disconnect()
      unmount?.()
    }
  }, [html])

  // Stick-figure scenes (<stick-scene>) are small canvas widgets served from
  // public/scenes. Load the runtime first, then each scene file a post names
  // in data-src: dynamic scripts with async = false run in insertion order,
  // and scene files read window.RIG as they load. Scripts stay loaded across
  // client navigations, and new <stick-scene> elements upgrade on their own.
  useEffect(() => {
    const scenes = body.current?.querySelectorAll<HTMLElement>("stick-scene")
    if (!scenes?.length) return
    // The scenes letter in Balsamiq Sans. Text drawn on a canvas doesn't make
    // the browser fetch a font, so ask for it once its stylesheet is in; the
    // scenes redraw every frame and pick it up. The runtime sees this link
    // and doesn't add its own.
    if (!document.querySelector(`link[href="${SCENE_FONT}"]`)) {
      const link = document.createElement("link")
      link.rel = "stylesheet"
      link.href = SCENE_FONT
      link.addEventListener("load", () => {
        document.fonts.load('400 10px "Balsamiq Sans"').catch(() => {})
      })
      document.head.append(link)
    }
    const sources = new Set(["/scenes/stick.js"])
    scenes.forEach((scene) => {
      if (scene.dataset.src) sources.add(scene.dataset.src)
    })
    for (const src of sources) {
      if (document.querySelector(`script[src="${src}"]`)) continue
      const script = document.createElement("script")
      script.src = src
      script.async = false
      document.head.append(script)
    }
  }, [html])

  return (
    <>
      <div
        ref={body}
        className="prose mt-10"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {slots.map(({ node, ...props }, index) =>
        createPortal(
          <Suspense fallback={null}>
            <Playground {...props} />
          </Suspense>,
          node,
          index
        )
      )}
    </>
  )
}
