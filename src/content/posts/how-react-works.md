---
title: "How React works under the hood: render, commit and Fiber"
description: "What happens between setState and the screen: elements, the trigger, render and commit steps, the Fiber tree, reconciliation and keys, where hooks live, batching and effects."
date: "2026-11-18"
tags: ["react", "javascript", "internals"]
---

You write `setCount(count + 1)`, and a moment later the number on the
screen changes. In between, React does a surprising amount of work. And
most of the rules we learn as React developers (keep render pure, use
stable keys, call hooks in the same order, state doesn't change right
away) are consequences of how that work is done.

This post follows one click from start to finish. Once you've seen the
machinery, the rules stop being rules to memorize and become things you'd
have figured out yourself. The scenes play once when they scroll into view.
Click any of them to play it again.

## The short version

React turns a state change into pixels in three steps. The React docs call
them trigger, render and commit:

1. **Trigger.** Something asks for an update: the first render, or a state
   change.
2. **Render.** React calls your components to find out what the UI should
   look like now, and compares that with what it looked like before.
3. **Commit.** React applies the differences to the DOM. Then the browser
   paints.

<figure class="scene">
<stick-scene scene="react-pipeline" data-src="/scenes/react-internals.js" play="view"></stick-scene>
<figcaption>One click: the update is queued on Count, React re-renders only Count, and commits a single change to the page.</figcaption>
</figure>

The rest of this post zooms into each step. First, though, what React
actually works with.

## Components return descriptions, not DOM

JSX is syntax for a function call. The compiler turns this:

```jsx title="what you write"
<button className="primary" onClick={save}>
  Save
</button>
```

into this:

```js title="what the compiler produces"
import { jsx } from "react/jsx-runtime"

jsx("button", { className: "primary", onClick: save, children: "Save" })
```

And that call returns a plain object, called a React element:

```js title="what React gets (simplified)"
{
  $$typeof: Symbol.for("react.transitional.element"),
  type: "button",
  key: null,
  props: { className: "primary", onClick: save, children: "Save" },
}
```

That object is all a component returns: a description of what it wants on
the screen. Creating one doesn't touch the DOM, so it's cheap. A tree of
these objects is what people mean by the "virtual DOM".

The `type` is either a string, for a DOM element like `"button"`, or one of
your components. When it's a component, React has to call it to find out
what it renders, and that's the core of the render step.

## Step 1: trigger

Two things start a render: the first `root.render(<App />)`, and every
state update after that.

A state setter doesn't change the variable. It adds an update to a queue
on the component and asks React to schedule a render. That's why this
classic surprise happens:

```jsx title="counter.jsx"
function handleClick() {
  setCount(count + 1) // queues "set to 1"
  setCount(count + 1) // queues "set to 1" again: count is still 0 here
  console.log(count) // 0
}
```

`count` is a snapshot of the render your handler belongs to. It won't
change until the next render calls your component again. To build on the
value that's already queued, pass a function instead:
`setCount((c) => c + 1)`. React runs those functions in order when it
processes the queue.

### Updates are batched

React doesn't render after each setter call. It waits until your event
handler has finished, then processes the whole queue in a single render.

<figure class="scene">
<stick-scene scene="react-batch" data-src="/scenes/react-internals.js" play="view"></stick-scene>
<figcaption>Three updates, one render. React waits until the handler has returned, then applies them together.</figcaption>
</figure>

Since React 18 this happens everywhere: in event handlers, promises,
timeouts and native event listeners. Before 18, React only batched inside
its own event handlers, so three updates after an `await` meant three
renders. In the rare case where you need the DOM updated immediately, for
example to scroll to an item you just added, `flushSync` from `react-dom`
forces it.

## Step 2: render

Rendering means React calling your components. It doesn't mean touching
the DOM. That comes later.

### The Fiber tree

For every component and DOM element on the screen, React keeps a _fiber_:
a plain object that remembers what that part of the UI is, and what needs
to happen to it. Simplified, it looks like this:

```js title="a fiber (simplified)"
{
  type: Count,            // your function, or "div"
  key: null,
  pendingProps: { … },    // props for this render
  memoizedProps: { … },   // props from the last render
  memoizedState: hook1,   // the first hook; the rest follow as a list
  child, sibling, return, // first child, next sibling, parent
  flags,                  // what the commit must do: insert, update, delete…
  lanes,                  // the priority of pending updates
  alternate,              // this fiber's twin in the other tree
}
```

React keeps two of these trees. The _current_ tree matches what's on the
screen. The _work-in-progress_ tree is the one being built during a
render, and each fiber points to its twin through `alternate`. When the
render is finished and committed, the two swap roles: the work-in-progress
tree becomes current. Games do the same with their frames, drawing the
next one off-screen and swapping it in when it's complete.

### Walking the tree

React processes the tree one fiber at a time: down to the first child,
across to its siblings, then back up to the parent. Because the work is
split into small units, React can stop between them. During a transition,
React checks every few milliseconds whether the browser needs the main
thread back, for a keystroke for example, and steps aside. That's how
`useTransition` keeps typing smooth while a slow part of the page updates.
I covered that in [Async React](/writing/async-react).

React also doesn't call every component on every update. In the first
scene, the update was queued on `Count`, so React walks past `App` and
`Header` without calling them, renders `Count`, and never visits `List`.
What it does do by default: when a component renders, its children render
too, unless they're memoized.

### Rendering must be pure

Because a render can be paused, thrown away and restarted, and because
Strict Mode renders every component twice in development to check, your
components can't have side effects while they render. No fetching, no DOM
changes, no writing to variables outside the component. Given the same
props and state, a component should return the same JSX. Side effects
belong in event handlers, or in effects, which run after the commit.

### Reconciliation: comparing old and new

When a component returns new elements, React compares them with the fibers
it already has. A general algorithm for comparing two trees is far too
slow for every update, so React relies on two rules instead:

1. **Same type in the same place: keep it.** React keeps the fiber, along
   with its state, and updates its props.
2. **Different type: replace it.** If `<div>` becomes `<section>`, or
   `<Profile>` becomes `<Settings>`, React throws away the old subtree and
   all the state in it, and builds a new one.

For lists, position alone isn't enough, so React matches children by their
`key`. Several everyday rules follow from this:

```jsx title="consequences.jsx"
// Same type, same place: the input keeps whatever was typed in it.
{isAdmin ? <input placeholder="Admin" /> : <input placeholder="User" />}

// A new key is a new component: an easy way to reset a form's state.
<ProfileForm key={userId} userId={userId} />

// Index keys: delete the first todo, and its internal state (say, an open
// edit box) moves to the next one, because the fiber at position 0 lives on.
{todos.map((todo, i) => <Todo key={i} todo={todo} />)}

// Stable keys: each todo keeps its own fiber, wherever it moves.
{todos.map((todo) => <Todo key={todo.id} todo={todo} />)}
```

It's also why you shouldn't define a component inside another component.
The inner function is a new function on every render, which means a new
type, so React throws away its fiber and state every time.

### Where hooks live

As far as React is concerned, hooks don't have names. A component's hooks
are stored on its fiber as a list, in the order they were called. On every
render, the first hook call gets the first slot, the second call gets the
second slot, and so on.

<figure class="scene">
<stick-scene scene="react-hooks" data-src="/scenes/react-internals.js" play="view"></stick-scene>
<figcaption>React hands out hook values in call order. Click again to put the first hook inside an if.</figcaption>
</figure>

That's the whole reason for the Rules of Hooks: call them at the top level,
never inside conditions or loops. If a condition skips a hook, every hook
after it reads the slot that belonged to the one before:

```jsx title="profile.jsx"
function Profile({ show }) {
  if (show) {
    const [count, setCount] = useState(0) // slot 1, but only sometimes
  }
  const [name, setName] = useState("Ana") // gets slot 1 when show is false
  useEffect(() => {}) // gets slot 2: the slot `name` used before
}
```

In development, React notices the changed order and warns, and a changed
number of hooks throws an error. The hooks lint rule catches it before you
even run the code. The one exception is `use`, which React designed so you
can call it inside conditions and loops.

## Step 3: commit

The render ends with a set of fibers flagged for changes: insert this,
update that, delete the other. The commit applies them all in one go,
without stopping, so the user never sees a half-updated page:

1. **Mutation.** React inserts, updates and removes DOM nodes, but only
   where something changed. In the first scene, a single text node goes
   from 3 to 4, and nothing else in the DOM is touched.
2. **Layout.** React attaches refs and runs `useLayoutEffect`. The DOM is
   updated but not yet painted, so this is where you measure an element
   and adjust before anyone sees it.
3. **Paint.** React is done, and the browser paints the new frame.
4. **Effects.** `useEffect` callbacks run, usually after the paint, so
   they don't delay what the user sees. Cleanups from the previous render
   run first.

You can see the order for yourself:

```jsx title="order.jsx"
function Box() {
  console.log("render")
  useLayoutEffect(() => console.log("layout effect"))
  useEffect(() => console.log("effect"))
  return <div ref={() => console.log("ref")} />
}
// render → ref → layout effect → (paint) → effect
```

## Myths this clears up

- **"The virtual DOM makes React fast."** It doesn't make DOM updates
  faster than writing them by hand. It lets you describe the whole UI and
  still touch only what changed. The comparison itself takes time, which is
  why large trees still need care.
- **"A re-render repaints the page."** A re-render means calling your
  component. If it returns the same output, the commit has nothing to do
  and the DOM isn't touched.
- **"setState is async."** It doesn't return a promise, and there's
  nothing to await. It queues an update, and the render happens after your
  handler finishes.
- **"React re-renders the whole app on every change."** It renders the
  component whose state changed and the components below it. Its parents
  and siblings aren't called.

## How it got this way

- **2013:** React launches with the virtual DOM and a recursive reconciler,
  later called the Stack reconciler. Once it started rendering a tree, it
  couldn't stop until it was done.
- **2017:** React 16 ships Fiber, a rewrite of the reconciler that splits
  rendering into units of work that can be paused and resumed.
- **2019:** Hooks arrive in React 16.8, stored as a list on each fiber.
- **2020:** React 17 adds the new JSX transform (`react/jsx-runtime`), so
  files no longer need `import React`.
- **2022:** React 18 adds concurrent rendering for transitions, and batches
  updates everywhere.
- **2024:** React 19 adds Actions and `use`, and `ref` becomes a regular
  prop.
- **2025:** React Compiler 1.0 memoizes components and values at build
  time, so skipping work that hasn't changed no longer depends on
  hand-written `memo`, `useMemo` and `useCallback`.

## What to take from it

Each rule is a consequence of how React works:

- **Keep render pure,** because React may call it more than once, pause it,
  or throw the result away.
- **Call hooks at the top level,** because they're matched by order, not
  by name.
- **Use stable keys,** because keys are how React matches list items from
  one render to the next.
- **Don't define components inside components,** because a new function is
  a new type, and a new type loses its state.
- **Use updater functions** when an update depends on the previous value,
  because state is a snapshot and updates are queued.
- **Let the compiler memoize** where you can. It applies the skips you
  would otherwise write by hand.

The React docs explain each piece well:
[Render and Commit](https://react.dev/learn/render-and-commit),
[Queueing a Series of State Updates](https://react.dev/learn/queueing-a-series-of-state-updates),
[Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state)
and the [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks).
For the design behind Fiber, Andrew Clark's
[React Fiber Architecture](https://github.com/acdlite/react-fiber-architecture)
notes are still the best introduction.
