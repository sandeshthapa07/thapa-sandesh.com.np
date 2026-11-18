---
title: "React Server Components: what they fix, and how we got here"
description: "What React Server Components are, the problems they solve (heavy bundles, request waterfalls, API glue), what they don't fix, and the road from renderToString to React 19."
date: "2026-11-18"
tags: ["react", "javascript", "performance", "architecture"]
---

React Server Components are components that only ever run on the server.
They render ahead of time, either at build time or when a request comes in,
and their code never reaches the browser. The browser gets what they
rendered, plus the code for the few components that actually need to be
interactive.

That's the whole idea. It sounds small, but it moves where the work
happens, and it took the React team about four years to go from the first
demo to a stable release.

This post covers what React looked like before, what Server Components
change, what they don't, and how we got here. The two scenes below play
once when they scroll into view. Click either one to play it again.

## Before: the browser did all the work

For most of React's life, a React app was a JavaScript program that the
browser had to download and run before it could show anything. A typical
single-page app loaded like this:

1. The server sends an almost empty HTML file and a `<script>` tag.
2. The browser downloads the bundle: React, your components, and every
   library they import.
3. React runs and renders a loading state, because it has no data yet.
4. Components fetch their data from an API. When it arrives they render
   their children, which then fetch _their_ data.

<figure class="scene">
<stick-scene scene="rsc-before" data-src="/scenes/rsc.js" play="view"></stick-scene>
<figcaption>Before: a heavy bundle first, then one request at a time, each waiting for the one before it.</figcaption>
</figure>

The code looked something like this. Nothing in it is wrong. It was the
standard way to write React for years:

```jsx title="Post.jsx (rendered in the browser)"
import { useEffect, useState } from "react"
import { marked } from "marked"
import sanitizeHtml from "sanitize-html"

export function Post({ id }) {
  const [post, setPost] = useState(null)

  useEffect(() => {
    fetch(`/api/posts/${id}`)
      .then((res) => res.json())
      .then(setPost)
  }, [id])

  if (!post) return <Spinner />

  const html = sanitizeHtml(marked(post.body))
  return (
    <article>
      <Author id={post.authorId} />
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <LikeButton postId={post.id} count={post.likes} />
      <Comments postId={post.id} />
    </article>
  )
}
```

That one component shows four problems:

- **Every component ships, even ones that never change.** To turn Markdown
  into HTML, every visitor downloads a Markdown parser and a sanitizer,
  runs them once, and never needs them again. In the React team's original
  proposal, those two libraries alone came to over 240 KB of JavaScript
  (over 74 KB gzipped).
- **Requests form a waterfall.** `<Author>` and `<Comments>` can't start
  fetching until `Post` has its data, because they don't exist until it
  renders. Each level of the tree waits for a full round trip between the
  user's device and the server. On a slow mobile network that's hundreds of
  milliseconds per level.
- **You write an API just to move data.** The data lives next to the
  server, but the component that needs it lives in the browser. So you
  write an endpoint for each screen, decide how much it returns, and keep
  the two in sync.
- **Users stare at spinners.** Nothing useful appears until the bundle has
  downloaded, parsed and run, and the first request has come back.

### Server-side rendering helped, partly

Frameworks like Next.js render the same components to HTML on the server
first. That fixed the blank first screen: users see the page right away.
But:

- The browser still downloads the JavaScript for **every** component on
  the page, the Markdown parser included, and runs it to _hydrate_ the
  HTML, which means attaching event handlers to it. Until that finishes,
  the page looks ready but the buttons don't respond.
- Data loads once, at the top of the route (`getServerSideProps` in the
  old Next.js, loaders in Remix), not in the components that use it. You
  pass it down by hand.
- The data is often sent twice: once as HTML, and again as JSON inside the
  page, so that hydration produces the same result.

Server rendering made the first screen faster. It didn't make the app
smaller, and it didn't let components fetch their own data on the server.

## After: render on the server, ship only what's interactive

Server Components split your components into two kinds:

- **Server Components** are the default. They run on the server, can be
  `async`, and can read the database, the file system or secret API keys
  directly. Their code is never sent to the browser.
- **Client Components** are the components you already know: state,
  effects, event handlers. You mark them with `"use client"` at the top of
  the file, and their code ships to the browser as before.

Here's the same post as a Server Component:

```jsx title="Post.jsx (Server Component)"
import { Suspense } from "react"
import { marked } from "marked"
import sanitizeHtml from "sanitize-html"
import { db } from "./db"
import { LikeButton } from "./LikeButton"

export async function Post({ id }) {
  const post = await db.posts.find(id)
  const html = sanitizeHtml(marked(post.body))

  return (
    <article>
      <Author id={post.authorId} />
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <LikeButton postId={post.id} initialCount={post.likes} />
      <Suspense fallback={<p>Loading comments…</p>}>
        <Comments postId={post.id} />
      </Suspense>
    </article>
  )
}
```

The like button is the only part that needs to run in the browser, so it's
the only Client Component:

```jsx title="LikeButton.jsx"
"use client"

import { useState, useTransition } from "react"
import { like } from "./actions"

export function LikeButton({ postId, initialCount }) {
  const [count, setCount] = useState(initialCount)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const next = await like(postId)
      startTransition(() => setCount(next))
    })
  }

  return (
    <button disabled={isPending} onClick={handleClick}>
      ♥ {count}
    </button>
  )
}
```

And `like` is a Server Function. The browser calls it like any async
function, and React and the bundler turn the call into a request to the
server:

```js title="actions.js"
"use server"

import { db } from "./db"
import { getUser } from "./auth"

// Anyone can call this, like any API route. Check who's asking.
export async function like(postId) {
  const user = await getUser()
  if (!user) throw new Error("Sign in to like posts")
  return db.likes.add(postId, user.id)
}
```

<figure class="scene">
<stick-scene scene="rsc-after" data-src="/scenes/rsc.js" play="view"></stick-scene>
<figcaption>After: the server reads the database next door, renders the page and sends it in one trip. Only the like button's code comes along.</figcaption>
</figure>

Here's what changed:

- **The Markdown libraries stay on the server.** `marked` and
  `sanitize-html` run there, and only the HTML they produce is sent. They
  add nothing to the browser's bundle. The browser downloads React and
  `LikeButton`, and that's it.
- **No waterfall from the browser.** `Post`, `Author` and `Comments` still
  fetch their own data, but on the server, a few milliseconds from the
  database, instead of from a phone on the other side of the world. You can
  still build a waterfall on the server by awaiting things one after
  another. It's just much cheaper there, and Suspense lets the slow parts
  arrive later instead of holding up the rest.
- **No API layer for reads.** The component that needs the data reads it.
  There's no endpoint to design, version or keep in sync.
- **Streaming.** `<Suspense>` lets the server send the post first and the
  comments when they're ready, in the same response. The scene shows the
  page arriving in one trip. In practice it can arrive in pieces, top
  first.
- **Interactivity only where you ask for it.** `"use client"` marks the
  boundary. Everything above it renders once on the server, and only what's
  below it hydrates in the browser.
- **Writes without hand-written endpoints.** `"use server"` turns `like`
  into a Server Function, so the button can call the server without you
  writing a route for it.

### What goes over the wire

A Server Component doesn't send HTML. It sends a serialized description of
the tree it rendered, usually called the RSC payload. The real format is
React's own streaming format, but in spirit it looks like this:

```js title="RSC payload, simplified"
// Roughly what the browser receives for <Post id={42} />
["article", {}, [
  ["p", { className: "author" }, "Sandesh Thapa"],
  ["h1", {}, "React Server Components"],
  ["div", { dangerouslySetInnerHTML: { __html: "<p>…</p>" } }],
  // A Client Component is a reference: load this module, use these props.
  [{ module: "LikeButton.jsx", export: "LikeButton" }, { postId: 42, initialCount: 12 }],
]]
```

Two things follow from that:

- **Props that cross the boundary must be serializable.** Strings,
  numbers, plain objects, arrays, dates, promises and JSX can go from a
  Server Component to a Client Component. Ordinary functions and class
  instances can't. Server Functions are the exception, because what
  crosses is a reference to the server, not the function itself.
- **React can merge a new render into the page you have.** Because the
  payload is a description and not HTML, navigating or refetching keeps
  client state such as typed text, focus and scroll position. That's what
  separates Server Components from plain server-side templates.

### Server Components and server-side rendering

The two names sound alike and they work together, but they answer
different questions:

- **Server-side rendering (SSR)** answers "how do I show HTML before the
  JavaScript loads?" It runs your components on the server once to produce
  HTML, then the browser hydrates them.
- **Server Components** answer "which components need to exist in the
  browser at all?" They run only on the server, and the browser never gets
  their code.

A typical framework does both. It renders Server Components to the RSC
payload, then uses SSR to turn that payload into HTML for the first page
load. You can also use either one without the other: Server Components
rendered at build time with no server at all, or classic server rendering
with no Server Components.

## What they don't fix

- **They need a framework.** Server Components need a bundler that
  understands `"use client"` and `"use server"`, and a server or build step
  that can render and stream them. You can't add them to an existing
  single-page app with one import.
- **Two environments, one tree.** You now need to know where each file
  runs. Server Components can't use state or effects. A Client Component
  can only include a Server Component that it receives as `children` or
  another prop. If it imports one directly, that file quietly becomes
  client code and ships to the browser. Most confusing errors in these
  apps come from this boundary.
- **Caching gets harder.** Rendering on the server means deciding what to
  cache, for how long, and when to throw it away. Frameworks have already
  changed their caching defaults more than once.
- **The server boundary is attack surface.** A Server Function is a public
  endpoint, however it looks in the code: check authentication and
  validate input in every one. In December 2025, a flaw in how React
  decoded requests to Server Functions
  ([CVE-2025-55182](https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components))
  let attackers run code on unpatched servers. It was rated 10 out of 10,
  and apps that supported Server Components could be vulnerable even if
  they defined no Server Functions.
- **Not every app benefits.** A highly interactive app, like an editor, a
  drawing tool or a dashboard full of live controls, is mostly Client
  Components anyway. Server Components pay off when much of the page is
  content: blogs, docs, stores, feeds.

## A short history

The idea is older than React. Facebook's PHP code used XHP, which let
developers write HTML-like components on the server, and XHP inspired JSX.
In a way, Server Components bring React back to where it came from. What's
new is that server and client components mix in one tree.

- **2013:** React is open-sourced. It renders in the browser, though it
  can already render to an HTML string on the server.
- **2015–2016:** "Universal" JavaScript catches on: render on the server,
  hydrate in the browser. Next.js launches in October 2016 and makes it
  easy.
- **2018:** Dan Abramov demos Suspense at JSConf Iceland. It later becomes
  the basis for streaming.
- **December 2020:** The React team announces
  [zero-bundle-size React Server Components](https://react.dev/blog/2020/12/21/data-fetching-with-react-server-components),
  with a talk by Dan Abramov and Lauren Tan, an RFC and a demo app. Server
  files end in `.server.js` and client files in `.client.js`. It's clearly
  marked as research.
- **2021–2022:** Early adopters experiment. Shopify's Hydrogen builds on an
  early version, then moves to Remix.
- **March 2022:** React 18 ships streaming server rendering and selective
  hydration. That's the plumbing Server Components need.
- **October 2022:** Next.js 13 introduces the App Router in beta, the first
  big framework built on Server Components. The filename convention is
  replaced by the `"use client"` directive.
- **May 2023:** The App Router becomes stable in Next.js 13.4, with Server
  Actions in alpha.
- **December 2024:** [React 19](https://react.dev/blog/2024/12/05/react-19)
  makes Server Components and Server Actions (now called Server Functions)
  part of stable React. The lower-level APIs that bundlers use can still
  change between minor versions.
- **2025:** Support spreads beyond Next.js. React Router ships an RSC
  preview built on Parcel in May, and a Vite version in September. Vite
  gets an official plugin, `@vitejs/plugin-rsc`. In December,
  CVE-2025-55182 shows the cost of the new server boundary, and every
  framework ships patches.

Even TanStack Start, which this site runs on, now has an `rsc` entry
point.

## What I'd take from it

This blog doesn't use Server Components, but it uses the idea. Posts are
Markdown files, and a small Vite plugin turns them into HTML at build time,
with Shiki highlighting the code. The Markdown parser and the highlighter
never reach your browser. That's the same move as a Server Component
rendered at build time, done by hand for one kind of page. Server
Components make that move available to any component, at build time or
per request, without writing a plugin.

So, my rules of thumb:

- **If most of a page is content that doesn't change after it renders,**
  Server Components, or a static site generator, will cut what you ship.
- **Keep `"use client"` at the leaves:** buttons, forms, menus. The higher
  it sits in the tree, the more of the tree ships.
- **Treat every `"use server"` function as a public API route,** because
  that's what it is.

The React docs on
[Server Components](https://react.dev/reference/rsc/server-components),
[`"use client"`](https://react.dev/reference/rsc/use-client) and
[Server Functions](https://react.dev/reference/rsc/server-functions) are
the best reference. The original
[RFC](https://github.com/reactjs/rfcs/blob/main/text/0188-server-components.md)
still explains the motivation better than anything written since.
