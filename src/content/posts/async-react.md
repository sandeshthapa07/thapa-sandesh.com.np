---
title: "Async React explained: transitions, Actions and Suspense"
description: "What Async React means, and how transitions, Actions, useOptimistic, Suspense and action props replace the loading-state code we write by hand."
date: "2026-11-17"
tags: ["react", "javascript", "performance"]
---

Most of the React code I write isn't about what the app does. It's about
waiting: a request is in flight, a response came back in the wrong order, a
button got clicked twice, a spinner flashed for 80 milliseconds. Every
component handles that its own way, and most of them get something slightly
wrong.

Async React is the React team's name for moving that work out of our
components. It isn't a new library or a single API. It's a way of using
features React already has (transitions, Actions, optimistic updates and
Suspense) so that React coordinates the waiting, and our code only says what
should happen.

The examples in this post are live. Edit the code and the preview updates.
They import from a fake `./api`: use **Network** to make it fast, slow or
random, and **Fail requests** to make every call fail. The **Requests** log
under the preview shows each call as it happens.

## Three problems Async React solves

Here are the three you notice as a user. Each playground has the problem and
the fix in the same code: the checkbox at the top of the preview switches
between them.

### 1. Typing freezes while the page updates

JavaScript runs on one main thread, and React renders on it too. Normally,
when you type, React re-renders everything that depends on the input before
the browser can paint the next letter. If part of the page is slow to
render, like a big chart, a long list or a filtered table, every keystroke
waits for it. The input lags, letters appear in bursts, and if the work is
heavy enough the browser offers to kill the unresponsive page.

**The fix: `useTransition`.** Mark the slow update as a transition and React
treats it as non-urgent. It renders it in the background in small chunks,
handing the main thread back to the browser between them, so urgent work,
like showing the letter you just typed, goes first. If you type again before
it finishes, React throws the outdated render away and starts again with the
new text.

```jsx playground title="slow-chart.jsx" network="none"
import { memo, useState, useTransition } from "react"

export default function App() {
  const [smooth, setSmooth] = useState(false)
  const [text, setText] = useState("")
  const [chartText, setChartText] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleChange(event) {
    const value = event.target.value
    setText(value) // urgent: show the letter now
    if (smooth) {
      startTransition(() => setChartText(value)) // can wait
    } else {
      setChartText(value) // urgent too: typing waits for it
    }
  }

  return (
    <>
      <label>
        <input
          type="checkbox"
          checked={smooth}
          onChange={(e) => setSmooth(e.target.checked)}
        />
        Update the chart in a transition
      </label>
      <label>
        Type quickly
        <input value={text} onChange={handleChange} />
      </label>
      <div style={{ opacity: isPending ? 0.5 : 1 }}>
        <SlowChart text={chartText} />
      </div>
    </>
  )
}

// Slow on purpose: 100 bars that each take 2ms to render.
const SlowChart = memo(function SlowChart({ text }) {
  const bars = []
  for (let i = 0; i < 100; i++) {
    bars.push(<Bar key={i} text={text} index={i} />)
  }
  return (
    <div
      style={{ display: "flex", alignItems: "end", gap: 1, height: 96 }}
    >
      {bars}
    </div>
  )
})

function Bar({ text, index }) {
  const start = performance.now()
  while (performance.now() - start < 2) {
    // Pretend this is expensive work.
  }
  let hash = index + 1
  for (const char of text) {
    hash = (hash * 31 + char.charCodeAt(0)) % 1000
  }
  const height = `${10 + (hash % 90)}%`
  return <span style={{ flex: 1, height, background: "currentColor" }} />
}
```

Type quickly with the checkbox off: the input falls behind your keys,
because every letter waits for 100 slow bars. Turn it on and type again. The
input keeps up, the chart dims while it catches up, and it redraws once you
pause.

Two details make it work. The input keeps its own urgent state, because a
text input can't be controlled by a transition. And `memo` lets the urgent
render skip the chart, since its `text` prop hasn't changed yet. When you
can't reach the state's `set` function, for example when the text arrives as
a prop, `useDeferredValue` does the same job.

Here is what the main thread is doing meanwhile. Someone types "async react"
at about nine letters a second. Each <span class="c-blue">blue</span> mark is
the browser handling a keystroke, and each
<span class="c-orange" data-part="render" data-figure="main-thread">orange
block</span> is React rendering the chart, which takes
<span class="scrub" data-figure="main-thread" data-key="cost"></span> like the
100 bars above. Compare
<button class="set" data-figure="main-thread" data-set="transition=false">a
normal update</button> with
<button class="set" data-figure="main-thread" data-set="transition=true">a
transition</button>:

<figure class="explorable" id="main-thread" aria-label="A timeline of the main thread while someone types. Keystrokes on top, the work the thread does in the middle, and the moment each letter reaches the screen at the bottom."></figure>

With a normal update, every keystroke waits behind the renders queued in
front of it. The slanted lines get longer with each letter, and turn red
once the delay passes 100 ms, about where typing stops feeling instant. At
200 ms per render, the input finishes showing "async react" more than a
second after the last key was pressed.

With a transition, each letter is on screen within a few milliseconds.
React renders the chart in slices of about 5 ms and checks for input between
them. When a new keystroke arrives, it throws away the render that just
became outdated (the hatched blocks) and starts again with the new text. The
chart only catches up when you pause. Drag the render time down to
<button class="set" data-figure="main-thread" data-set="cost=30">30 ms</button>
and both versions keep up, which is why you only need a transition for
updates that are actually slow.

### 2. Every click waits for the server

Most actions go to a server, and a round trip takes anywhere from a few
milliseconds to a few seconds. If the UI waits for the response before it
changes, the app feels slow even when nothing is wrong, and people click
again because they aren't sure the first click worked.

**The fix: `useOptimistic`.** Show the result straight away, and let the
request run in the background as an Action. When the server answers, the
real data takes the optimistic version's place. If the request fails, the
optimistic version disappears on its own.

```jsx playground title="messages.jsx" network="slow"
import {
  startTransition,
  useOptimistic,
  useRef,
  useState,
} from "react"
import { sendMessage } from "./api"

export default function App() {
  const [instant, setInstant] = useState(false)
  const [messages, setMessages] = useState([])
  const [error, setError] = useState(null)
  const [shownMessages, addShownMessage] = useOptimistic(
    messages,
    (current, message) => [...current, { ...message, sending: true }]
  )
  const form = useRef(null)

  // A form action runs as a transition, so the request happens in the
  // background while the optimistic message is on screen.
  async function sendAction(formData) {
    const text = formData.get("text")
    setError(null)
    if (instant) {
      addShownMessage({ id: crypto.randomUUID(), text })
      form.current.reset()
    }
    try {
      const saved = await sendMessage(text)
      startTransition(() => setMessages((list) => [...list, saved]))
    } catch {
      setError(`Couldn't send "${text}".`)
    }
  }

  return (
    <>
      <label>
        <input
          type="checkbox"
          checked={instant}
          onChange={(e) => setInstant(e.target.checked)}
        />
        Show messages optimistically
      </label>
      {shownMessages.length === 0 && <p>No messages yet.</p>}
      <ul>
        {shownMessages.map((message) => (
          <li
            key={message.id}
            style={{ opacity: message.sending ? 0.5 : 1 }}
          >
            {message.text}
            {message.sending && " (sending…)"}
          </li>
        ))}
      </ul>
      {error && <p role="alert">{error}</p>}
      <form ref={form} action={sendAction}>
        <label>
          Message
          <input name="text" required autoComplete="off" />
        </label>
        <button>Send</button>
      </form>
    </>
  )
}
```

With the checkbox off, send a message: nothing on screen changes until the
server answers, a second and a half later on Slow. Turn it on and send
another. It appears immediately, dimmed until the server confirms it. Turn
on Fail requests and send one more to watch it disappear by itself.

### 3. One slow request blanks the whole page

A page usually needs data from more than one place, and it doesn't all
arrive at once. The common pattern is one `isLoading` for the page: show a
spinner until everything has loaded. The page is then only as fast as its
slowest request, and the parts that were ready early stay hidden.

**The fix: Suspense boundaries.** A component that's still waiting for data
suspends, and React shows the fallback of the nearest `<Suspense>` above it,
for that part of the page only. Everything outside that boundary shows as
soon as it's ready, so the content at the top appears first and the slow
section fills in when its data arrives.

```jsx playground title="profile-page.jsx" network="slow"
import { Suspense, use, useState } from "react"
import { getPosts, getProfile } from "./api"

// use() needs the same promise each render: keep one per load.
const cache = new Map()
function cached(key, request) {
  if (!cache.has(key)) cache.set(key, request())
  return cache.get(key)
}

export default function App() {
  const [perSection, setPerSection] = useState(false)
  const [version, setVersion] = useState(0)

  return (
    <>
      <label>
        <input
          type="checkbox"
          checked={perSection}
          onChange={(e) => {
            setPerSection(e.target.checked)
            setVersion((v) => v + 1)
          }}
        />
        Give the posts their own Suspense boundary
      </label>
      <button onClick={() => setVersion((v) => v + 1)}>Load again</button>
      <Suspense fallback={<p>Loading the page…</p>}>
        <Profile version={version} />
        {perSection ? (
          <Suspense fallback={<p>Loading posts…</p>}>
            <Posts version={version} />
          </Suspense>
        ) : (
          <Posts version={version} />
        )}
      </Suspense>
    </>
  )
}

function Profile({ version }) {
  const profile = use(cached(`profile-${version}`, getProfile))
  return (
    <p>
      <strong>{profile.name}</strong>, {profile.role}
    </p>
  )
}

function Posts({ version }) {
  const posts = use(cached(`posts-${version}`, getPosts))
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.slug}>{post.title}</li>
      ))}
    </ul>
  )
}
```

With the checkbox off, one boundary wraps the whole page, which behaves
like a page-level `isLoading`: the profile is ready quickly but stays hidden
until the slow posts arrive. Turn it on and the posts get their own
boundary. The profile shows up first, and only the posts section says it's
still loading. Press Load again to watch it again.

The rest of this post looks at each of these in more detail, and at the idea
that ties them together.

## The usual way: waiting by hand

Here is search the way most of us learned it:

```jsx playground title="search.jsx (the usual way)" network="random"
import { useEffect, useState } from "react"
import { searchPosts } from "./api"

export default function App() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    searchPosts(query)
      .then(setResults)
      .catch(setError)
      .finally(() => setIsLoading(false))
  }, [query])

  return (
    <>
      <label>
        Search posts
        <input value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      {error && <p role="alert">Search failed.</p>}
      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <ul>
          {results.map((post) => (
            <li key={post.slug}>{post.title}</li>
          ))}
        </ul>
      )}
    </>
  )
}
```

Try typing "react" quickly with Network on Random, and watch the Requests
log. Whenever an older request finishes last, the list shows results for the
wrong query. Switch to Fast and "Loading…" flashes on every keystroke
instead.

Here is that race slowed down. Typing "react" sends five requests, one per
letter, and each <span class="c-orange">orange bar</span> is a request
waiting for its response. Drag the end of a bar to change how long that
request takes:

<figure class="explorable" id="request-race" aria-label="Five search requests on a timeline, one per letter of react, each ending when its response arrives. The bottom row shows which query's results are on screen."></figure>

With **Set state on arrival**, which is what the effect above does, the list
always shows the response that landed last. Here that's "re", from the
second keystroke, so the search box says "react" and the results are for
"re". The order you typed in doesn't matter, only the order the network
answered in. Switch to
<button class="set" data-figure="request-race" data-set="mode=latest">Latest
query only</button> and responses for queries you've already typed past are
ignored, so the list waits for "react". The classic fix is an `ignore` flag
in the effect's cleanup. Suspense gets the same result without one, as
you'll see below.

It works on localhost. On a real network:

- **Responses arrive out of order.** Type "re", then "react". If the "re"
  request is slower, it lands last, and you see results for the wrong query.
- **The spinner flashes.** A fast response shows a spinner for a frame. A
  slow one blanks the list on every keystroke.
- **Every component repeats it.** The rename form, the like button and the
  settings page each get their own `isLoading`, their own `error`, their own
  double-submit guard, and their own bugs.

None of these are hard to fix once. The trouble is that we fix them one
component at a time, forever.

## What Async React is

The name comes from Ricky Hanlon's two-part talk,
[Async React](https://www.youtube.com/watch?v=zyVRg2QR6LA&t=10907s), at React
Conf 2025. The [demo from the talk](https://github.com/rickhanlonii/async-react)
makes the goal concrete: on a fast network the app feels synchronous, and on
a slow one it shows loading states, without the app code doing anything
different.

The trick is where the async code lives. Instead of every component managing
its own requests, the layers underneath handle it once:

- **Routers** run navigations as transitions.
- **Data libraries** read data through Suspense.
- **Design components** like buttons, tabs and selects accept `action` props
  and run them as transitions, with pending and optimistic states built in.

Product code then mostly passes async functions around. The React team set
up an [Async React working group](https://github.com/reactwg/async-react)
with library authors to make this the default.

The building blocks are all in React today:

- **Transitions and Actions** (`useTransition`, `startTransition`): run async
  work without blocking the UI, with a pending flag.
- **`useActionState` and form actions:** forms that track their own result,
  errors and pending state.
- **`useOptimistic`:** show the result before the server confirms it.
- **Suspense and `use`:** read data and let a boundary handle the loading
  state.
- **`useDeferredValue`:** keep the current UI on screen while the next one
  gets ready.
- **`<ViewTransition>`:** animate between the two. Stable since
  [React 19.3](https://react.dev/blog/2026/09/09/react-19-3).

Here is each one, with an example.

## Actions: async work in a transition

A transition is an update React can work on in the background. It doesn't
block typing or clicking, and it doesn't swap content that's already on
screen for a loading fallback. Since React 19, the function you pass to
`startTransition` can be async. React calls that an **Action**, and keeps
`isPending` true from the moment it starts until the work is done.

```jsx playground title="publish-button.jsx" network="slow"
import { useState, useTransition } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { publishPost } from "./api"

function PublishButton({ postId }) {
  const [isPending, startTransition] = useTransition()
  const [published, setPublished] = useState(false)

  function publish() {
    startTransition(async () => {
      await publishPost(postId)
      startTransition(() => setPublished(true))
    })
  }

  if (published) return <p>Published.</p>
  return (
    <button onClick={publish} disabled={isPending}>
      {isPending ? "Publishing…" : "Publish"}
    </button>
  )
}

export default function App() {
  return (
    <ErrorBoundary
      fallbackRender={({ resetErrorBoundary }) => (
        <p role="alert">
          Couldn't publish.{" "}
          <button onClick={resetErrorBoundary}>Try again</button>
        </p>
      )}
    >
      <PublishButton postId="async-react" />
    </ErrorBoundary>
  )
}
```

No `isLoading` state, no `try`/`finally`. If `publishPost` throws, the error
goes to the nearest error boundary, the same as an error thrown while
rendering. Turn on Fail requests and click Publish to see it. (The
`ErrorBoundary` here is a small copy of the one from
[react-error-boundary](https://github.com/bvaughn/react-error-boundary).)

Notice the second `startTransition`. A state update after an `await` loses
track of the transition it belongs to, so for now it needs wrapping again.
The React docs call this a known limitation that goes away once JavaScript
gets [AsyncContext](https://github.com/tc39/proposal-async-context).

## Forms: useActionState

Forms get a higher-level version. Pass a function to `<form action>` and
React runs it as an Action with the form's `FormData`. Wrap that function in
`useActionState` and you also get state: whatever the last run returned.

```jsx playground title="rename-form.jsx" network="slow"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { updateName } from "./api"

async function renameAction(previous, formData) {
  const name = formData.get("name").trim()
  if (!name) return { name, error: "Name can't be empty." }

  try {
    return { name: await updateName(name), error: null }
  } catch {
    return { name, error: "Couldn't save. Try again." }
  }
}

function RenameForm({ initialName }) {
  const [state, formAction] = useActionState(renameAction, {
    name: initialName,
    error: null,
  })

  return (
    <form action={formAction}>
      <label>
        Name
        <input name="name" defaultValue={state.name} />
      </label>
      <SubmitButton />
      {state.error && <p role="alert">{state.error}</p>}
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return <button disabled={pending}>{pending ? "Saving…" : "Save"}</button>
}

export default function App() {
  return <RenameForm initialName="Sandesh" />
}
```

Clear the field and save to see the validation error, or turn on Fail
requests and change the name. Either way, what you typed is still there
afterwards.

What this replaces:

- **No `onSubmit`, no `preventDefault`, no `isSaving` state.**
- **The button knows on its own.** `useFormStatus` reads the pending state
  of the form it's rendered in, so `SubmitButton` works in any form without
  props.
- **Submits run in order.** `useActionState` queues calls and runs them one
  at a time, each one receiving the result of the one before. Two quick
  submits can't race each other.
- **Expected errors are just state.** Return them. Throw only for the
  unexpected ones, which go to an error boundary.

One thing that surprises people: when a form action succeeds, React resets
the form's uncontrolled fields to their `defaultValue`, and returning an
error counts as success. That's why `renameAction` returns the name the user
typed when it fails. It becomes the new default, so their input survives the
reset.

## Optimistic updates

Some actions are so likely to succeed that waiting for the server is the
wrong default: a like, a bookmark, a checkbox. `useOptimistic` shows the new
value straight away and goes back to the real one when the Action ends.

```jsx
const [optimisticLiked, setOptimisticLiked] = useOptimistic(liked)
```

- While an Action is pending, `optimisticLiked` is whatever you set it to.
- When the Action ends, it's `liked` again, which by then holds the new value
  from the parent.
- If the Action fails, `liked` never changed, so the UI goes back to what it
  showed before. There's no rollback code to write.

The setter has to be called inside an Action, which leads to the most useful
idea in Async React.

## Action props: write the async code once

Put the transition and the optimistic state inside your shared components,
and give them an `action` prop instead of `onClick` or `onChange`. Here's a
toggle button, and a `Bookmark` that uses it. In a real app they'd live in
separate files, so `ToggleButton`'s own `startTransition` from
`useTransition` doesn't clash with the one `Bookmark` imports.

```jsx playground title="bookmark.jsx" network="slow"
import {
  startTransition,
  useOptimistic,
  useState,
  useTransition,
} from "react"
import { saveBookmark } from "./api"

// ui/toggle-button.jsx: written once, used by every toggle.
function ToggleButton({ pressed, action, children }) {
  const [optimisticPressed, setOptimisticPressed] = useOptimistic(pressed)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState(null)

  function toggle() {
    const next = !optimisticPressed
    setError(null)
    startTransition(async () => {
      setOptimisticPressed(next)
      try {
        await action(next)
      } catch {
        setError("Couldn't save that. Try again.")
      }
    })
  }

  return (
    <>
      <button
        aria-pressed={optimisticPressed}
        data-pending={isPending ? "" : undefined}
        onClick={toggle}
      >
        {children}
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  )
}

// bookmark.jsx: says what should happen, nothing about waiting.
function Bookmark({ post }) {
  const [saved, setSaved] = useState(post.saved)

  return (
    <ToggleButton
      pressed={saved}
      action={async (next) => {
        await saveBookmark(post.id, next)
        startTransition(() => setSaved(next))
      }}
    >
      Save for later
    </ToggleButton>
  )
}

export default function App() {
  return <Bookmark post={{ id: "async-react", saved: false }} />
}
```

`Bookmark` has no pending state, no optimistic state and no rollback. It
says what should happen, and the button decides how that feels. Click it on
Slow: it turns on straight away, and a spinner appears once the save takes
longer than 300ms. Turn on Fail requests and click again: the button falls
back to `pressed` by itself, and the error message comes from the button,
written once for every toggle in the app.

That's the payoff. In the talk's demo, as its README puts it, "the design
components expose `action` props so callbacks are in async transitions by
default." Improve the button and every screen that uses it improves too.
React's docs suggest naming these props `action` or giving them an `Action`
suffix, like `submitAction` or `changeAction`, so it's clear they run in a
transition.

The `data-pending` attribute leaves the loading indicator to CSS, which can
wait before showing it. An action that finishes in under 300ms never shows a
spinner at all. Switch the playground to Fast and you won't see one:

```css title="ui/toggle-button.css"
button[data-pending]::after {
  content: "";
  /* spinner styles */
  animation: fade-in 150ms 300ms both;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}
```

## Reading data: Suspense and use

Back to the search from the start. Instead of copying results into state, a
component reads them with `use`, and a `<Suspense>` boundary shows the
fallback while they load:

```jsx playground title="search.jsx" network="random"
import { Suspense, use, useDeferredValue, useState } from "react"
import { searchPosts } from "./api"

// use() needs the same promise on every render, so keep one per query.
const cache = new Map()
function cachedSearch(query) {
  if (!cache.has(query)) cache.set(query, searchPosts(query))
  return cache.get(query)
}

export default function App() {
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const isStale = query !== deferredQuery

  return (
    <>
      <label>
        Search posts
        <input value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <Suspense fallback={<p>Searching…</p>}>
        <div style={{ opacity: isStale ? 0.5 : 1 }}>
          <Results query={deferredQuery} />
        </div>
      </Suspense>
    </>
  )
}

function Results({ query }) {
  const posts = use(cachedSearch(query))
  if (posts.length === 0) return <p>No posts match “{query}”.</p>
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.slug}>{post.title}</li>
      ))}
    </ul>
  )
}
```

Type "react" quickly again, on Random. The Requests log still shows
responses finishing out of order, but the list always matches what's in the
box.

What changed:

- **Typing stays urgent.** `query` updates right away and `deferredQuery`
  follows in the background, so a slow request or render never holds up the
  input.
- **Old results stay on screen.** While a new query loads, React keeps the
  last results up, dimmed, instead of a spinner. The fallback only shows on
  the very first load.
- **Out-of-order responses can't win.** Each query has its own promise, and
  `Results` renders whichever query is current. A slow response for "re"
  just fills the cache.
- **Repeat queries are instant.** Delete a letter and the earlier results
  come straight from the cache, with no request.
- **No `isLoading`, no `error` state.** Loading is the Suspense boundary's
  job. Failure is an error boundary's job.

In a real app, don't hand-roll the cache. This one never expires, and a
failed request stays failed until you press Reset. A data library does it
properly, with invalidation, expiry and retries. TanStack Query's `useSuspenseQuery`, for
example, suspends the same way. Better still, start the request before
render, in a route loader or an event handler, and pass the promise down.
The React docs warn that fetching lazily in render delays requests and can
create waterfalls.

## Animate it: ViewTransition

React 19.3 made `<ViewTransition>` stable. It uses the browser's View
Transition API, and it only animates the non-urgent updates: transitions,
Suspense reveals and `useDeferredValue` updates. Urgent updates like typing
stay instant.

```jsx
import { Suspense, ViewTransition } from "react"

// ...
<ViewTransition>
  <Suspense fallback={<ResultsSkeleton />}>
    <Results query={deferredQuery} />
  </Suspense>
</ViewTransition>
```

You can try it in the search playground above: add `ViewTransition` to the
import from "react", wrap the `<Suspense>` in it, and type a query.

The skeleton appears immediately, and cross-fades into the results when they
arrive. Each new set of results cross-fades in too, since `deferredQuery` is
a deferred update. Because everything above already runs as transitions,
adding animation is one wrapper, not a rewrite.

## Gotchas

- **Updates after `await`** need their own `startTransition`, until
  AsyncContext lands.
- **Transitions don't run in order.** If two Actions race, the slower one
  can finish last. `useActionState` and form actions queue for you. For
  anything else, cancel the old request with an `AbortController`.
- **Cache every promise you pass to `use`.** A promise created during render
  is a new promise on every render, so the fallback shows again and again
  and the content never appears.
- **Keep text inputs out of transitions.** An input needs its state updated
  urgently. Keep the input's state urgent and defer whatever depends on it,
  as the search example does.
- **Decide where errors land.** Return expected errors as state. Unexpected
  ones thrown from an Action go to the nearest error boundary, so put
  boundaries where a failure should stay contained. With `useActionState`, a
  throw also cancels any queued calls.

## How you benefit

- **Less code.** Most `isLoading`, `error` and `finally` blocks disappear.
- **Fewer race bugs.** Ordering, stale responses and double submits are
  handled by React's primitives, not by each component.
- **Fast where it can be, honest where it can't.** Optimistic updates and
  delayed indicators make quick actions feel instant. Slow ones still show
  progress.
- **Consistency.** Every button, form and list waits the same way, because
  the waiting lives in a few shared components.
- **Animation almost for free.** Once updates are transitions,
  `<ViewTransition>` can animate them.

## Where to start

You don't have to rewrite anything. Roughly in order of payoff:

1. **Give your shared components action props.** Buttons, toggles, tabs and
   selects. Every screen that uses them gets pending and optimistic states.
2. **Move forms to actions** with `useActionState` and `useFormStatus`.
3. **Read data through Suspense**, with your data library's suspense hooks
   or your router's loaders.
4. **Defer inputs that drive slow UI** with `useDeferredValue`.
5. **Add `<ViewTransition>`** once the rest is in place.

Very little of this is new API. Transitions and Suspense date back to React
18, Actions, `useOptimistic` and `use` arrived in React 19, and
`<ViewTransition>` went stable in 19.3. What's new is the idea that product
code shouldn't have to touch them much. The router, the data layer and the
design system handle the waiting, and our components say what should happen.

I'd start with one button. The
[`useTransition` docs](https://react.dev/reference/react/useTransition),
including their troubleshooting section, are the best reference, and the
[async-react demo](https://github.com/rickhanlonii/async-react) shows the
whole thing working together.
