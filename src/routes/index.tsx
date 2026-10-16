import { useSyncExternalStore } from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { ArrowRight, ArrowUpRight, MapPin } from "lucide-react"
import { HangingLamp } from "@/components/hanging-lamp"
import { PostList } from "@/components/post-list"
import { Band, SectionTitle } from "@/components/section"
import { projects } from "@/content/projects"
import type { Project } from "@/content/projects"
import { site } from "@/content/site"
import { toolkit } from "@/content/toolkit"
import { posts } from "@/lib/posts"
import { seo } from "@/lib/seo"

export const Route = createFileRoute("/")({
  head: () =>
    seo({ title: site.title, description: site.description, path: "/" }),
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
  const time = useNepalTime()
  const links = site.socials.filter((social) => social.label !== "Email")

  return (
    <section className="mx-auto grid max-w-[960px] grid-cols-1 gap-10 px-6 pt-8 pb-16 sm:px-8 sm:pt-16 sm:pb-20 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-16">
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
      <div className="order-first flex items-start gap-5 sm:gap-8 lg:order-none lg:items-center lg:gap-6 lg:self-stretch lg:justify-self-end">
        <Polaroid />
        <HangingLamp />
      </div>
    </section>
  )
}

function Polaroid() {
  return (
    <figure className="relative w-fit shrink-0 -rotate-3 bg-[#fafaf9] p-2.5 pb-9 shadow-[0_1px_2px_rgb(0_0_0/0.08),0_16px_40px_-12px_rgb(0_0_0/0.35)] transition-transform duration-500 ease-out-quint hover:rotate-0 motion-reduce:transition-none sm:p-3 sm:pb-10">
      <span
        aria-hidden
        className="absolute -top-3 left-1/2 h-6 w-20 -translate-x-1/2 rotate-2 bg-yellow/90"
      />
      <img
        src="/me.jpg"
        alt="Sandesh smiling in front of a red brick wall"
        width={460}
        height={460}
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

function MoreLink({ href, children }: { href: string; children: string }) {
  return (
    <div className="py-6 text-center">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-fg-3 transition-colors hover:text-foreground"
      >
        {children} <ArrowUpRight className="size-3.5" />
      </a>
    </div>
  )
}
