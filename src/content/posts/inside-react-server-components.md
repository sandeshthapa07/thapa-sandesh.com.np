---
title: "Inside React Server Components, from a database row to a button click"
description: "Follow a code diff through Flight and Suspense, then learn when to use React Server Components, which interactions belong in the browser, and how to spot costly boundaries."
date: "2026-11-23"
tags: ["react", "javascript", "architecture", "performance"]
---

Imagine opening a code review on your phone. The page needs a syntax-highlighted diff and a button that collapses it. Highlighting requires the source text, a parser, and a language grammar. Collapsing the diff takes one bit of state. Why download a grammar to make a button work?

React Server Components (RSC) let the server run the highlighter and send its rendered result to a small interactive component. They also let the page read the diff during the render, saving the round trip you'd get if a browser component mounted first and then requested the file. The [RSC introduction](/writing/react-server-components) covers those trade-offs at the application level. Here we'll follow the actual values across the boundary.

## Who owns the diff?

Suppose the application already has a review store and a highlighter that produces React elements. Here's the server side of a review page in an RSC-enabled framework.

```jsx title="Review.jsx"
import { Suspense } from "react"
import { readDiff } from "./review-store"
import { highlightLines } from "./highlight"
import { Fold } from "./Fold"

async function Diff({ reviewId }) {
  const patch = await readDiff(reviewId)
  return <pre><code>{highlightLines(patch)}</code></pre>
}

export function Review({ reviewId }) {
  return (
    <article>
      <h1>Review {reviewId}</h1>
      <Fold>
        <Suspense fallback={<p>Reading diff…</p>}>
          <Diff reviewId={reviewId} />
        </Suspense>
      </Fold>
    </article>
  )
}
```

Try the client half below. Hide the diff, then switch files. Before you show it again, predict which line you'll see and whether the panel will have opened by itself.

```jsx playground title="Fold.jsx" network="none"
"use client"

import { useState } from "react"

export default function App() {
  const [file, setFile] = useState("theme.css")
  const isTheme = file === "theme.css"

  return (
    <>
      <button onClick={() => setFile(isTheme ? "app.js" : "theme.css")}>
        Switch to {isTheme ? "app.js" : "theme.css"}
      </button>
      <p>Reviewing <strong>{file}</strong></p>
      <Fold>
        <pre>{isTheme ? "+ color: teal" : "+ return review"}</pre>
      </Fold>
    </>
  )
}

export function Fold({ children }) {
  const [open, setOpen] = useState(true)
  return (
    <section>
      <button aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "Hide diff" : "Show diff"}
      </button>
      {open && children}
    </section>
  )
}
```

The nesting is deliberate. In the *rendered tree*, the diff sits inside `Fold`. In the *import graph*, `Review` owns both components and `Fold` imports only React. The bundler follows imports when it encounters `"use client"`. Passing a rendered child through a prop keeps the highlighter and its grammar on the server side of that boundary. Moving the highlighter import into `Fold` would pull it into the client graph. [React's guide to the client module boundary](https://react.dev/reference/rsc/use-client)

## What goes into the Flight stream?

Flight is React's format for transporting a rendered component model. Follow the first render of review 42:

1. **The server calls `Review`.** It can describe the article and heading immediately. When the RSC renderer encounters `Fold`, its type is a client reference supplied by the bundler. The renderer records which module export the consumer needs, along with its props. The click handler lives in that module.
2. **The diff suspends.** While `readDiff(42)` is pending, React can emit the surrounding model, including the Suspense boundary and its fallback. A reference identifies the outstanding subtree. This lets a consumer start processing the review before the database has returned the patch.
3. **The missing piece arrives.** Once the read resolves, the server runs `highlightLines`. React emits the resulting element data under the outstanding identifier. That data includes text and span props. The grammar, the database handle, and the implementation of `Diff` stay on the server.

Think of the receiver as keeping a table of pieces by ID. It can encounter a reference before the corresponding piece arrives. The Flight decoder tracks that dependency and makes the value available when the piece is ready. Client references have another dependency: the bundler's runtime must resolve the export and load its JavaScript. These are implementation details, and the record encoding can change between React releases. [React Flight server](https://github.com/facebook/react/blob/main/packages/react-server/src/ReactFlightServer.js) · [React Flight client](https://github.com/facebook/react/blob/main/packages/react-client/src/ReactFlightClient.js)

## First paint, first click, next review

### Release the diff yourself

Imagine the heading and button have arrived, but the database read is still pending. What can a reader already do? Fold the panel, release the diff, then reopen it. Replay the example with the panel open to see exactly which text Suspense replaces.

This browser playground uses a promise you resolve by hand to stand in for the late Flight record. React runs the Suspense boundary and the fold interaction locally. A production RSC framework supplies the streamed data.

```jsx playground title="pending-diff.jsx" network="none"
import { Suspense, use, useState } from "react"

function pendingDiff() {
  let release
  const result = new Promise(resolve => { release = resolve })
  return { result, release }
}

function Diff({ result }) {
  const line = use(result)
  return <pre>{line}</pre>
}

export default function App() {
  const [stream, setStream] = useState(pendingDiff)
  const [delivered, setDelivered] = useState(false)
  const [open, setOpen] = useState(true)

  function deliver() {
    stream.release("+ color: teal")
    setDelivered(true)
  }

  function replay() {
    setStream(pendingDiff())
    setDelivered(false)
    setOpen(true)
  }

  return (
    <>
      <p><strong>Review 42 · theme.css</strong></p>
      <button aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "Fold panel" : "Open panel"}
      </button>
      {open && (
        <Suspense fallback={<p>Reading diff…</p>}>
          <Diff result={stream.result} />
        </Suspense>
      )}
      <p>
        <button onClick={delivered ? replay : deliver}>
          {delivered ? "Replay stream" : "Release diff"}
        </button>
      </p>
    </>
  )
}
```

<details>
<summary>Why does reopening the panel reveal the line immediately?</summary>
<p>The parent still holds the promise you resolved. Reopening mounts the diff again, and React can read that same result. In this example, only “Replay stream” creates another pending read.</p>
</details>

### What happens on a real page load?

On an initial visit, a framework can feed the model into React's HTML renderer. That renderer can run the initial render of `Fold`, so the browser can paint “Hide diff” before its JavaScript loads. The framework also delivers the Flight data. React uses the model and the client module to hydrate the existing button. That's when its click handler becomes available. The two renders produce different things: Flight describes the tree, and server-side rendering (SSR) produces HTML for the browser to paint. [React's Server Components reference](https://react.dev/reference/rsc/server-components)

Click “Hide diff” and the work is local. `setOpen(false)` updates `Fold` in the browser. Click “Show diff” and it can display its existing children again without fetching the patch. One consequence is easy to miss: even an initially collapsed panel can incur the server read and transfer cost when its parent supplies a server-rendered diff as a child. To load the patch on demand, the interaction must actually initiate a request.

Now navigate within the app from review 42 to review 43. An RSC-aware router can request a new model and React can reconcile it with the mounted tree. If the router preserves this subtree and `Fold` keeps its type, position, and key, its open state survives while its children change. If every review should start expanded, giving `Fold` a `key={reviewId}` tells React that each review owns a distinct instance. [React on preserving and resetting state](https://react.dev/learn/preserving-and-resetting-state)

## Where does the cost go?

For this page, I'd measure two different transfers: the JavaScript needed to operate the button and the bytes needed to display the highlighted patch. Moving the grammar to the server reduces the first. A ten-thousand-line diff represented by thousands of spans can still make the second enormous. Suspense can reveal the heading sooner, but someone still pays to read, highlight, transfer, and display every visible line.

That gives the code review a concrete design test. If readers mostly inspect one file, render that file and fetch another when they select it. If they repeatedly edit a patch and expect highlighting on every keystroke, a browser-side highlighter may earn its download. The right boundary depends on which work the next interaction needs to repeat.

## When should I use a Server Component?

Ask what makes this particular part of the screen change. One review page can have three different answers.

| What changes it? | Where I'd do the work | Why |
| --- | --- | --- |
| Publishing a new version of the public review guidelines | Render the guidelines at build time | Every reader gets the same text. Parse the Markdown once per build and serve the result as a static page. |
| Opening a private review | Render the review on the server after checking access | The server can read the authorized files and render the first diff in one request from the browser. |
| Typing a comment, selecting lines, or folding a panel | Keep that interaction in a Client Component | Each gesture needs immediate feedback. The draft can stay on the device until the reviewer submits it. |

For an existing app, I'd start with one read-heavy route where there's a cost I can name. A review viewer that ships a syntax grammar to every phone is a good candidate. A static blog that already highlights code at build time has already captured that saving. An offline editor still needs local state, storage, and enough client code to edit without a connection. Adding RSC to either app calls for a more specific reason. [React's guide to build-time and request-time rendering](https://react.dev/reference/rsc/server-components)

## What problems show up in practice?

**The heading appears quickly, but the diff still arrives late.** Suppose a review loads its file list, then its comments, then its patch. If all three reads need only the review ID and access has been checked, awaiting them in sequence makes their delays add up. Start the independent reads together. Keep a genuine dependency, such as needing the file list to identify the default patch, in sequence. Suspense controls what readers see while they wait. It can't start a query that the application hasn't issued.

**A component works until you move it across the boundary.** A server-rendered toolbar might try to pass an ordinary `onToggle` function to a client button. The browser can't reconstruct that closure from its props. Put the handler alongside the button's state and pass the review ID or rendered children across the boundary. If the button saves a review, treat the write as a separate server operation and check the caller's permission there. [React's guide to serializable props](https://react.dev/reference/rsc/use-client)

**A small client bundle can still expose too much data.** Passing the whole review record to a client badge sends its serializable fields to the browser, including fields the badge never displays. If the badge only says “Approved,” pass the status. For a private review, check access before reading or rendering the diff. Once its text reaches the device, collapsing the panel only changes what is visible.

**Saving succeeds, but the screen shows yesterday's review.** A database write and a cached render have different lifetimes. Decide which review data can be shared, how long it can stay stale, and how a successful write triggers a fresh read in your framework. Test with two reviewers: after one approves the patch, what does the other see on their next visit? A second test with a user who lacks access catches a different mistake: reusing a private result across users.

Before moving a whole route, I'd compare the same first visit and file switch on a slow connection. Check how much JavaScript arrives, how large the rendered diff is, and how long it takes until a reviewer can read the first changed line. Then type a comment while the next file loads. Those observations tell you whether the change helped someone actually review code.
