import {
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { createPortal } from "react-dom"
import { usePostHog } from "@posthog/react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { ArrowRight, ArrowUpRight, MapPin } from "lucide-react"
import { PostList } from "@/components/post-list"
import { Band, SectionTitle } from "@/components/section"
import { projects, sideProjects } from "@/content/projects"
import type { Project, SideProject } from "@/content/projects"
import { site } from "@/content/site"
import { toolkit } from "@/content/toolkit"
import { posts } from "@/lib/posts"
import { seo } from "@/lib/seo"
import { homeSchema } from "@/lib/structured-data"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/")({
  head: () =>
    seo({
      title: site.title,
      description: site.description,
      path: "/",
      jsonLd: homeSchema(),
    }),
  component: Home,
})

function Home() {
  return (
    <>
      <Hero />

      <section aria-labelledby="projects-title">
        <SectionTitle
          id="projects-title"
          kicker="Projects"
          title="Things I've built"
          subtitle="SaaS products and online stores I've shipped"
        />
        <ul className="reveal grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard key={project.title} project={project} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="side-projects-title">
        <SectionTitle
          id="side-projects-title"
          kicker="Side projects"
          title="Made on my own time"
          subtitle="A letter app, and two open-source npm packages for apps built in Nepal"
        />
        <ul className="reveal grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {sideProjects.map((project, index) => (
            <SideProjectCard
              key={project.title}
              project={project}
              featured={index === 0}
            />
          ))}
        </ul>
        <MoreLink href={site.github}>More on GitHub</MoreLink>
      </section>

      <section aria-labelledby="toolkit-title">
        <SectionTitle
          id="toolkit-title"
          kicker="Toolkit"
          title="What I use every day"
          subtitle="Editor, stack and the apps around them"
        />
        <ul className="reveal grid grid-cols-2 gap-2.5 lg:grid-cols-5">
          {toolkit.map((tool) => (
            <li
              key={tool.name}
              className={`tone-${tool.tone} flex flex-col gap-3 rounded-[18px] bg-panel px-5 py-5 sm:flex-row sm:items-center sm:gap-3.5`}
            >
              <tool.icon
                className="size-6 shrink-0 text-(--tone-text)"
                strokeWidth={1.75}
              />
              <div className="min-w-0">
                <h3 className="text-sm font-medium">{tool.name}</h3>
                <p className="text-xs text-fg-3">{tool.note}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Band />
      <section aria-labelledby="writing-title">
        <SectionTitle
          id="writing-title"
          kicker="Writing"
          title="Notes from the work"
          subtitle="What I learn and discover along the way"
        />
        <div className="reveal">
          <PostList posts={posts.slice(0, 5)} />
        </div>
        <div className="py-6 text-center">
          <Link
            to="/writing"
            className="inline-flex items-center gap-1.5 text-sm text-fg-3 transition-colors hover:text-foreground"
          >
            All writing <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </section>
    </>
  )
}

const inlineLink =
  "text-foreground underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-yellow-deep"

function Hero() {
  const posthog = usePostHog()
  const time = useNepalTime()
  const links = site.socials.filter((social) => social.label !== "Email")

  return (
    <section className="relative mx-auto grid max-w-[880px] grid-cols-1 gap-10 px-6 pt-8 pb-16 sm:px-8 sm:pt-16 sm:pb-20 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-16">
      <HeroCharm />
      <div>
        <h1 className="text-4xl leading-[1.1] font-semibold tracking-tight sm:text-5xl">
          Hi, I&apos;m Sandesh.
        </h1>
        <div className="mt-6 max-w-[520px] space-y-4 text-[17px] leading-relaxed text-fg-2">
          <p>
            I&apos;m a frontend developer at{" "}
            <a
              href={site.companyUrl}
              target="_blank"
              rel="noreferrer"
              className={inlineLink}
            >
              {site.company}
            </a>
            , living and working in Nepal.
          </p>
          <p>
            I care a lot about craft and accessibility: the spacing, the focus
            states, the motion that stays out of the way. Mostly I like
            interfaces that feel fast and effortless. Now and then I{" "}
            <Link to="/writing" className={inlineLink}>
              write about what I learn
            </Link>
            .
          </p>
        </div>
        <ul className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <li>
            <a
              href={`mailto:${site.email}`}
              onClick={() => {
                posthog.capture("contact_initiated", { placement: "hero" })
                posthog.logger.info("contact link selected", {
                  placement: "hero",
                })
              }}
              className="inline-flex items-center gap-1.5 font-medium underline decoration-yellow decoration-2 underline-offset-[6px] transition-colors hover:decoration-yellow-deep [&_svg]:transition-transform hover:[&_svg]:translate-x-0.5"
            >
              Say hi <ArrowRight className="size-3.5" />
            </a>
          </li>
          {links.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  const platform = link.label.toLowerCase()

                  posthog.capture("social_profile_visited", {
                    platform,
                    placement: "hero",
                  })
                  posthog.logger.info("social profile link selected", {
                    platform,
                    placement: "hero",
                  })
                }}
                className="inline-flex items-center gap-1 text-fg-2 transition-colors hover:text-foreground"
              >
                {link.label} <ArrowUpRight className="size-3.5 text-fg-3" />
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-8 flex items-center gap-1.5 text-xs text-fg-3">
          <MapPin className="size-3.5" />
          {site.location}
          {time && (
            <span className="animate-in duration-500 fade-in">
              · {time} there right now
            </span>
          )}
        </p>
      </div>
      <Polaroid />
    </section>
  )
}

// A nimbu mirchi (a lemon and green chillies on a thread) hangs from the top
// of the home page, to keep the evil eye (nazar) away, as it does over shop
// doors in Nepal. You can drag it, fling it or brush past it.
//   - Phones and tablets: top right, beside the polaroid.
//   - 80rem and up: in the margin, just right of the polaroid.
//   - In between, the two-column hero has no free space, so it isn't shown.
// It's drawn on a transparent full-screen canvas, so a swing or a fling is
// never cut off. The canvas lets the pointer through to the page except over
// the charm itself. The thread is tied to a marker in the hero, so the charm
// scrolls with the page (and sways as it does).
// three.js is big, so it loads once the page is idle, only on the client, and
// stops drawing once the hero has scrolled away.
const NimbuMirchi = lazy(() =>
  import("@/components/nimbu-mirchi").then((module) => ({
    default: module.NimbuMirchi,
  }))
)
const CHARM_FITS = "(width < 64rem), (width >= 80rem)"
const CHARM_WIDE = "(width >= 80rem)"
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)"
// Pixels per world unit: the charm is ~4.5 units long, so ~145px on phones
// and ~185px on wide screens, the size it had in its old box.
const CHARM_UNIT = { narrow: 32, wide: 41 }
// How far above the viewport the knot can go before the charm is out of
// sight and drawing stops.
const CHARM_REACH = 420

function useMedia(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener("change", onChange)
      return () => list.removeEventListener("change", onChange)
    },
    () => window.matchMedia(query).matches,
    () => false
  )
}

function HeroCharm() {
  const knot = useRef<HTMLDivElement>(null)
  const [idle, setIdle] = useState(false)
  const fits = useMedia(CHARM_FITS)
  const wide = useMedia(CHARM_WIDE)
  const still = useMedia(REDUCED_MOTION)

  useEffect(() => {
    const ready = () => setIdle(true)
    // Safari has no requestIdleCallback yet; fall back to a short timeout.
    const whenIdle = window.requestIdleCallback as
      typeof window.requestIdleCallback | undefined
    if (whenIdle) {
      const id = whenIdle.call(window, ready, { timeout: 2500 })
      return () => window.cancelIdleCallback(id)
    }
    const id = window.setTimeout(ready, 1200)
    return () => window.clearTimeout(id)
  }, [])

  // Where the knot is on screen, read every frame by the charm.
  const knotAt = () => knot.current?.getBoundingClientRect()
  const anchorX = () => knotAt()?.left ?? 0
  const anchorY = () => knotAt()?.top ?? 0
  const active = () => {
    const top = knotAt()?.top
    return top !== undefined && top > -CHARM_REACH && top < window.innerHeight
  }

  return (
    <>
      {/* The knot: a point at the top of the hero where the thread is tied. */}
      <div
        ref={knot}
        aria-hidden="true"
        className="absolute top-0 right-20 size-0 sm:right-24 xl:right-auto xl:left-full xl:ml-22"
      />
      {idle &&
        fits &&
        createPortal(
          <Suspense fallback={null}>
            <NimbuMirchi
              className="fixed inset-0 z-30"
              passThrough
              unit={wide ? CHARM_UNIT.wide : CHARM_UNIT.narrow}
              anchorX={anchorX}
              anchorY={anchorY}
              active={active}
              breeze={!still}
            />
          </Suspense>,
          document.body
        )}
    </>
  )
}

function Polaroid() {
  return (
    <figure className="relative order-first w-fit -rotate-3 bg-[#fafaf9] p-2.5 pb-9 shadow-[0_1px_2px_rgb(0_0_0/0.08),0_16px_40px_-12px_rgb(0_0_0/0.35)] transition-transform duration-500 ease-out-quint hover:rotate-0 motion-reduce:transition-none sm:p-3 sm:pb-10 lg:order-none lg:justify-self-end">
      <span
        aria-hidden
        className="absolute -top-3 left-1/2 h-6 w-20 -translate-x-1/2 rotate-2 bg-yellow/90"
      />
      <img
        src="/me.jpg"
        alt="Sandesh smiling in front of a red brick wall"
        width={460}
        height={460}
        fetchPriority="high"
        className="size-40 object-cover sm:size-[230px]"
      />
      <figcaption className="absolute inset-x-0 bottom-2.5 text-center font-mono text-[11px] text-[#63636b] sm:bottom-3 sm:text-xs">
        that&apos;s me
      </figcaption>
    </figure>
  )
}

// Local time in Nepal, read only on the client so the prerendered HTML
// never carries a stale time.
const nepalTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Kathmandu",
  hour: "numeric",
  minute: "2-digit",
})

function subscribeToClock(onTick: () => void) {
  const id = setInterval(onTick, 15_000)
  return () => clearInterval(id)
}

function useNepalTime() {
  return useSyncExternalStore(
    subscribeToClock,
    () => nepalTime.format(new Date()).toLowerCase(),
    () => null
  )
}

function ProjectCard({ project }: { project: Project }) {
  const posthog = usePostHog()
  const domain = new URL(project.href).hostname

  return (
    <li className="relative flex flex-col rounded-[18px] bg-panel p-6 transition-colors has-[a:hover]:bg-panel-2 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white p-2 ring-1 ring-line">
          <img
            src={project.logo}
            alt=""
            width={28}
            height={28}
            loading="lazy"
            decoding="async"
            className="size-full object-contain"
          />
        </span>
        <span className="flex items-center gap-1 font-mono text-xs text-fg-3">
          {domain}
          <ArrowUpRight className="size-3.5" />
        </span>
      </div>
      <h3 className="mt-5 flex items-center gap-2 text-[15px] font-medium">
        <a
          href={project.href}
          target="_blank"
          rel="noreferrer"
          onClick={() => {
            const projectType = project.badge ?? "other"

            posthog.capture("project_visited", {
              project: project.title,
              project_type: projectType,
            })
            posthog.logger.info("portfolio project link selected", {
              project_type: projectType,
            })
          }}
          className="outline-none after:absolute after:inset-0 after:rounded-[18px] focus-visible:after:ring-2 focus-visible:after:ring-ring"
        >
          {project.title}
        </a>
        {project.badge && (
          <span className="rounded-full border border-yellow-text/40 px-2 py-px font-mono text-[10px] tracking-[0.08em] text-yellow-text uppercase">
            {project.badge}
          </span>
        )}
      </h3>
      <p className="mt-1.5 max-w-[460px] text-sm leading-relaxed text-fg-3">
        {project.description}
      </p>
      <ul className="mt-auto flex flex-wrap gap-1.5 pt-5">
        {project.tags.map((tag) => (
          <li
            key={tag}
            className="rounded-full bg-panel-2 px-2.5 py-0.5 font-mono text-[11px] text-fg-2"
          >
            {tag}
          </li>
        ))}
      </ul>
    </li>
  )
}

// Secondary links on a side-project card sit above the card-wide link.
const cardLink =
  "relative z-10 inline-flex items-center gap-1 rounded-sm text-xs transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"

// A screenshot, what it is and why I made it. The first card (the side
// project) spans both columns on wider screens, with its text beside the
// screenshot; the packages sit side by side under it.
function SideProjectCard({
  project,
  featured,
}: {
  project: SideProject
  featured: boolean
}) {
  const posthog = usePostHog()
  const domain = new URL(project.href).hostname
  const track = (link: "site" | "source") => {
    posthog.capture("project_visited", {
      project: project.title,
      project_type: project.kind,
      link,
    })
    posthog.logger.info("side project link selected", {
      project_type: project.kind,
      link,
    })
  }

  return (
    <li
      className={cn(
        "group relative flex flex-col rounded-[18px] bg-panel p-2.5 transition-colors has-[a:hover]:bg-panel-2",
        featured &&
          "md:col-span-2 md:grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:items-center md:gap-3"
      )}
    >
      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-line">
        <img
          src={project.image.src}
          alt={project.image.alt}
          width={1360}
          height={850}
          loading="lazy"
          decoding="async"
          className="aspect-16/10 w-full object-cover transition-transform duration-700 ease-out-quint group-has-[a:hover]:scale-[1.015] motion-reduce:transition-none"
        />
      </div>
      <div className="flex flex-1 flex-col px-4 pt-5 pb-4 sm:px-5 sm:pb-5">
        <div className="flex items-center justify-between gap-4">
          <span className="rounded-full border border-yellow-text/40 px-2 py-px font-mono text-[10px] tracking-[0.08em] text-yellow-text uppercase">
            {project.kind}
          </span>
          <span className="flex items-center gap-1 font-mono text-xs text-fg-3">
            {domain}
            <ArrowUpRight className="size-3.5" />
          </span>
        </div>
        <h3 className="mt-4 text-[15px] font-medium wrap-break-word">
          <a
            href={project.href}
            target="_blank"
            rel="noreferrer"
            onClick={() => track("site")}
            className="outline-none after:absolute after:inset-0 after:rounded-[18px] focus-visible:after:ring-2 focus-visible:after:ring-ring"
          >
            {project.title}
          </a>
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-fg-2">
          {project.summary}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-fg-3">
          <strong className="font-medium text-foreground">
            Why I made it.
          </strong>{" "}
          {project.why}
        </p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
          <ul className="flex flex-wrap gap-1.5">
            {project.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-panel-2 px-2.5 py-0.5 font-mono text-[11px] text-fg-2"
              >
                {tag}
              </li>
            ))}
          </ul>
          {(project.post || project.source) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {project.post && (
                <Link
                  to="/writing/$slug"
                  params={{ slug: project.post }}
                  className={`${cardLink} font-medium text-foreground`}
                >
                  How I built it <ArrowRight className="size-3.5" />
                </Link>
              )}
              {project.source && (
                <a
                  href={project.source}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => track("source")}
                  className={`${cardLink} text-fg-3`}
                >
                  Source on GitHub <ArrowUpRight className="size-3.5" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

function MoreLink({ href, children }: { href: string; children: string }) {
  const posthog = usePostHog()

  return (
    <div className="py-6 text-center">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        onClick={() =>
          posthog.capture("social_profile_visited", {
            platform: "github",
            placement: "projects",
          })
        }
        className="inline-flex items-center gap-1.5 text-sm text-fg-3 transition-colors hover:text-foreground"
      >
        {children} <ArrowUpRight className="size-3.5" />
      </a>
    </div>
  )
}
