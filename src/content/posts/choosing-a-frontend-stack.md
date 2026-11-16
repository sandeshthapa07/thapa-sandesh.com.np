---
title: "Before AI picks Next.js for you: choosing a frontend stack"
description: "Why AI assistants reach for Next.js by default, what to ask before choosing a framework, and which frameworks and libraries solve which problems."
date: "2026-11-16"
tags: ["react", "nextjs", "architecture", "ai"]
---

Ask an AI assistant to start a web project and, more often than not, you
get Next.js. A portfolio? Next.js. An internal dashboard behind a login?
Next.js. A landing page with three sections? Next.js, with server
components and a deployment guide.

Next.js is a good framework. The problem is choosing it by default. Every
framework is a bundle of answers to specific problems: rendering on the
server, routing, data loading, caching. If you don't have those problems,
you still pay for the answers, in concepts to learn, infrastructure to run
and bugs to understand.

This post is a checklist for that decision: why AI keeps suggesting the same
thing, what to ask before choosing, and which tools solve what.

## The quick answer

If you only read one section, make it this one:

- **A single page, like a welcome or "coming soon" page:** plain HTML and
  CSS, plus a few lines of JavaScript if you really need them. No framework,
  no build step, no bundle.
- **A content site that needs SEO, like a blog, portfolio or docs:** a static
  site generator such as Astro. Every page is prerendered HTML, and
  JavaScript ships only where you add it.
- **Frontend and backend in one codebase:** Next.js. You get server rendering,
  server components, image optimisation, fine-grained caching, and content
  that refreshes on a schedule without a redeploy.
- **A CMS where editors build each page with its own layout:** WordPress,
  with its block editor or a page builder.
- **No SSR or SEO needed, like an admin portal or internal tool:** TanStack
  on Vite. TanStack Router and TanStack Query, plus TanStack Table and
  TanStack Form as you need them, deployed as static files.
- **An enterprise app with a large team and a strict structure:** Angular.
- **A highly reactive UI with as little code as possible:** Svelte, with
  SvelteKit when you need routing and server rendering.

The rest of this post explains why, and covers the cases in between.

## Why AI always says Next.js

- **It's what the internet wrote about.** Models learn from tutorials, docs,
  forum answers and public repos, and for years Next.js has been the most
  written-about way to start a React project.
- **It's what the docs say.** React's own
  [Creating a React App](https://react.dev/learn/creating-a-react-app) page
  lists Next.js first.
- **Training data lags.** A model recommends what was popular when its data
  was collected, not what fits your project today.
- **You didn't give it constraints.** "Build me a website" has one safe,
  popular answer. "A static portfolio, no server, deployed to Cloudflare"
  has a different one.

The last point is the one you control. More on that at the end.

## Start with questions, not frameworks

Answer these before picking anything. Most of the decision falls out of the
answers.

1. **What are you building?** A content site (blog, docs, marketing), an
   app (a dashboard behind a login), or a mix of both (a store)?
2. **Does it need search engines and a fast first load for strangers?** A
   public page does. An app behind a login doesn't: no crawler will ever
   see it.
3. **How fresh does the content need to be?** If it changes when you
   deploy, build it once. If it changes per user or per minute, it has to
   be rendered on request or fetched in the browser.
4. **How interactive is it?** Mostly reading with a few widgets, or an
   editor where every click changes state?
5. **Where will it run, and who pays?** Static files on a CDN cost almost
   nothing and rarely break. A server means uptime, scaling and a bill.
6. **Do you already have a backend?** If there's a Laravel, Rails, Django
   or Go API, you may not need another server layer in JavaScript.
7. **Who maintains it?** Your team's experience, and how easy it is to hire
   for, matter more than benchmarks.
8. **What are your users on?** Mid-range phones on mobile data feel every
   kilobyte of JavaScript you send.

## Rendering, in plain words

Frameworks mostly differ in **where and when the HTML gets made**. Learn
these five ideas and framework marketing gets much easier to read:

- **Static (SSG):** HTML is built once, at build time, and served as files.
  Cheapest and fastest. Content changes when you redeploy.
- **Server-side rendering (SSR):** HTML is built on every request. Needed
  for personalised or fast-changing pages that must load fast and be
  crawlable.
- **Single-page app (SPA):** the server sends an almost empty page and
  JavaScript builds everything in the browser. Fine behind a login, poor
  for public content.
- **Islands:** a static page with small interactive parts that load their
  own JavaScript. Most of the page ships none.
- **React Server Components:** components that run only on the server, so
  their code never reaches the browser, mixed with client components where
  you need interactivity.

Most frameworks can do several of these. What matters is which one is
their default, because the default is what you will live with.

## What each framework is actually for

### Next.js

**Solves:** full-stack React in one codebase. Server components, server
rendering and static generation, server actions for mutations, image and
font optimisation, and fine-grained caching, including pages that refresh
on a schedule without a redeploy.

**Good for:** large public React apps that need SEO and server logic
together, like stores, marketplaces, and SaaS products whose marketing site
and app share code.

**Think twice if:** the site is static, or the app lives entirely behind a
login. You would be taking on the server/client boundary, the caching
model and a server to host, for problems you don't have. Next.js runs
anywhere Node runs, but check what self-hosting involves before you commit.

### React Router (framework mode, formerly Remix)

**Solves:** routing with data built in. Each route has a `loader` for reads
and an `action` for writes, forms keep working before JavaScript loads, and
you can choose server rendering, an SPA or prerendering.

**Good for:** data-heavy apps and anything with lots of forms. It's also
the natural next step for existing React Router apps.

**Think twice if:** the site is mostly static content. Astro or plain
prerendering will be simpler.

### TanStack Start

**Solves:** full-stack React built on TanStack Router and Vite, with
type-safe routes and search params, server functions, server rendering and
static prerendering.

**Good for:** apps where type safety and state in the URL matter, like
filters, tables and dashboards. It's what this site is built with, with
every page prerendered to plain HTML.

**Think twice if:** you want the largest ecosystem and the most answers
online. It's younger than Next.js, and AI assistants know it less well.

### Vite + React with TanStack, no framework

**Solves:** Vite gives you a fast dev server and a production build, and
nothing else. The TanStack libraries fill in the rest: Router for type-safe
routes, Query for server data, Table and Form for the screens admin tools
are made of.

**Good for:** admin portals, dashboards and internal tools behind a login,
and widgets embedded in other sites. The result is a complete app that
deploys as static files, and TanStack Start can add server rendering later
if you ever need it.

**Think twice if:** public pages need to rank in search or load fast on the
first visit.

### Astro

**Solves:** content sites that ship zero JavaScript by default. Pages are
HTML, and interactive parts are islands that can be written in React, Vue,
Svelte or Solid.

**Good for:** blogs, documentation, marketing sites and portfolios.

**Think twice if:** the whole thing is one big interactive app. Islands work
best when most of the page isn't interactive.

### SvelteKit, Nuxt and SolidStart

Not everything has to be React:

- **SvelteKit** (Svelte): reactivity is built into the language, with runes
  like `$state` and `$derived`, and a compiler turns it into small, direct
  DOM updates. Highly interactive UIs take less code and ship small
  bundles.
- **Nuxt** (Vue): approachable, with strong conventions and a lot built in.
- **SolidStart** (Solid): React-like JSX with fine-grained reactivity, so
  only the exact thing that changed updates.

All three do server rendering, static generation and SPAs. The trade-off is
a smaller ecosystem, and fewer examples for AI assistants to learn from, so
expect more of their suggestions to need correcting.

### Angular

**Solves:** everything, in one official package: routing, forms, HTTP,
dependency injection, testing, and signals for reactivity.

**Good for:** large teams that want one way of doing things, and long-lived
enterprise apps.

**Think twice if:** you're a small team building something small. The
structure pays off at scale and costs you below it.

### WordPress

**Solves:** content management for people who don't write code. A visual
block editor, page builders, themes, and plugins for almost everything,
from forms to shops.

**Good for:** marketing sites and blogs where editors create pages
themselves, each with its own layout, without a developer for every change.

**Think twice if:** you're building an application rather than pages. Every
plugin adds weight and something to keep updated. If you want WordPress for
editing but your own frontend, you can use it headless and fetch the
content from a framework instead.

### No framework at all

For a single page, like a welcome or "coming soon" page, or a few pages,
HTML and CSS are enough. A static site generator like
Eleventy or Hugo adds templates and Markdown without shipping any
JavaScript. And if a server already renders your pages, as Laravel, Rails
or Django do, [htmx](https://htmx.org) adds interactivity through HTML
attributes, and Inertia.js lets those servers drive React or Vue pages
without building a separate API.

## Which library solves which problem

A framework is half the stack. The rest is libraries, and AI tends to add
those by reflex too. Each one should answer a problem you can name:

- **Data from a server (fetching, caching, refetching):** TanStack Query or
  SWR, or your framework's loaders. Don't copy server data into a global
  store.
- **State shared across the UI:** start with `useState` and context. Reach
  for Zustand or Jotai when distant components need the same state, and
  Redux Toolkit when a large team wants strict patterns and devtools.
- **State in the URL (filters, tabs, pagination):** typed search params in
  TanStack Router, or nuqs in Next.js. If it should survive a refresh or a
  shared link, it belongs in the URL.
- **Complex forms:** React Hook Form or TanStack Form, with Zod or Valibot
  schemas you can share with the server. Simple forms only need a `<form>`
  and your framework's actions.
- **Accessible components (dialogs, menus, selects):** Radix, React Aria or
  Base UI, or shadcn/ui, which copies components built on them into your
  project. Don't hand-roll a dropdown.
- **Styling:** Tailwind CSS, CSS Modules, or plain modern CSS, which now
  has nesting, container queries and `:has()`. Any of them is fine. Mixing
  three is not.
- **Tables with sorting and filtering:** TanStack Table. It's headless, so
  it brings the logic and you bring the markup.
- **Animation:** CSS transitions and view transitions first, Motion when
  you need gestures, springs or layout animations.
- **Testing:** Vitest for units, Playwright for the browser.

## The cases in between

The quick answer covers the common projects. A few more:

- **Online store:** something that renders on the server, for SEO and a
  fast first page: Next.js, React Router, Nuxt or SvelteKit.
- **SaaS product:** often two things. A static marketing site plus an SPA
  for the app, or one server-rendered framework if you'd rather keep a
  single codebase.
- **An app on an existing Laravel, Rails or Django backend:** server
  templates with htmx, or Inertia.js with React or Vue.
- **Something very interactive, like an editor or a canvas:** an SPA.
  Svelte or Solid make fine-grained updates easy, but how you manage state
  and rendering matters more than which one you pick.

## A real example: this site

The previous version of this site ran on Next.js 16, as a Node server in a
Docker container. The current one is a handful of pages built with TanStack
Start, prerendered to plain HTML at build time and served as static files
from Cloudflare. Nothing runs on a server when you open it.

Same kind of site, far less to run. That isn't a verdict on Next.js. It's
what happens when the stack matches the problem.

## Make AI work with your choice

AI assistants are good at building with whatever stack you choose. They are
just not good at choosing it for you. So decide first, then tell them:

- **Give constraints, not just goals.** Instead of "build me a portfolio",
  say "a static portfolio, no server, prerendered HTML, deployed to
  Cloudflare".
- **Ask for options before code.** "Suggest three stacks for this, with the
  trade-offs of each. Don't write any code yet."
- **Question every dependency.** When the assistant adds a package, ask what
  problem it solves in this project. If the answer is vague, remove it.
- **Write the decision down** in `AGENTS.md` or `CLAUDE.md`, so every
  session starts from it instead of from the popular answer:

```md title="AGENTS.md"
## Stack

- Vite + React SPA with TanStack Router and TanStack Query
- No SSR: the app is behind a login and deploys as static files
- Tailwind CSS, components from shadcn/ui
- Ask before adding a framework, a server or a new state library
```

## The short version

<div class="compare">
  <div class="dont">
    <p class="label">Start from the popular answer</p>
    <p>Accept the framework the assistant suggests, then spend months
    working around solutions to problems you never had.</p>
  </div>
  <div class="do">
    <p class="label">Start from your problems</p>
    <p>Answer the questions above, pick the simplest stack that covers
    them, and tell your AI tools exactly what that is.</p>
  </div>
</div>

Next.js isn't the wrong answer. An unexamined default is. Choose the
simplest thing that solves the problems you actually have. You can add a
server later far more easily than you can take one away.
