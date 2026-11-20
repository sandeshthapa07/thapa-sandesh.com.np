---
title: "React beyond UI components: one runtime, many screens"
description: "React is a library you install but it acts like a framework. Why it's really a UI runtime, and how react, react-dom and React Native split the work."
date: "2026-11-20"
tags: ["react", "javascript", "architecture"]
---

Short answer: React is a library you install, but it behaves like a
framework, and the most accurate name for it is a UI runtime. You never
call your components. React does, when it decides to, and it can draw them
into a browser, a phone, a terminal or a PDF.

React's first homepage, back in 2013, was modest about all of this: "Lots
of people use React as the V in MVC."[^v-in-mvc] Over a decade later, the
same library renders iPhone and Android apps, the terminal interfaces of
AI coding tools, 3D scenes and PDFs. It decides when your code runs and in
what order. It has opinions about how a component waits for data, how a
form talks to a server, and which components never leave the server at
all. Since 2025, it even has a compiler.

This isn't a tutorial, and you don't need any of it to build a good app.
It's about what React actually is once you look past the components,
because that's where its rules stop feeling arbitrary. Keep render pure,
call hooks in the same order, never call a component yourself: none of
that is ceremony. It's the contract you sign with a runtime.
{>> I also just wanted an excuse to draw a React machine <<}

## What "UI runtime" means

A library is code you call. A runtime is code that runs _your_ code: it
decides when your code runs, keeps track of its state while it lives, and
talks to the outside world on its behalf. Node.js is a runtime. You write
functions, and Node's event loop decides when they run and handles the
files and the network for them.

React does that job for user interfaces, and you can see the difference in
a few lines:

```js title="a library: you call it"
import { format } from "date-fns"

// Runs once, right now, because you called it. Then it's done.
format(new Date(), "d MMM yyyy")
```

```jsx title="a runtime: it calls you"
import { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"

function Clock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return <p>{now.toLocaleTimeString()}</p>
}

createRoot(document.getElementById("root")).render(<Clock />)
```

You never call `Clock()`. React calls it, again every second, remembers
`now` between calls, decides when to update the screen, and stops the
timer when the clock goes away. Your component only describes one moment.
Everything around that moment belongs to the runtime.

### Think of a USB-C charger

The easiest way I know to picture this is a charger.

For years, every device came with its own. A Nokia charger didn't fit a
Samsung, a laptop needed its own brick, and headphones had yet another
cable. Then USB-C became one standard: one plug shape, and one set of
rules for how a charger and a device agree on power. Now the same charger
charges a phone, a laptop, headphones and a game console.[^usb-c]
{>> we all have that drawer of old chargers <<}

<figure class="scene">
<stick-scene scene="react-usb-c" data-src="/scenes/react-usb-c.js" play="view"></stick-scene>
<figcaption>One charger, three devices. Each one asks for its own voltage and gets it: the same plug, a different handshake every time. Click to play it again.</figcaption>
</figure>

React does for UI what USB-C did for charging:

| USB-C | React |
| --- | --- |
| The charger you plug in | Your components |
| The plug shape and the Power Delivery rules | `react`: components, props, state, hooks |
| The charging chip inside each device | A renderer: `react-dom`, `react-native`, `ink`, `@react-pdf/renderer` |
| A phone, a laptop, headphones | A browser, a phone app, a terminal, a PDF |
| The charger and device agreeing how much power to send, and when | React deciding what to render, and how urgently |
| Cutting power safely when something shorts | An error boundary catching a crash |

The last two rows are where "runtime" comes in. An old, dumb cable is like a
library: it carries exactly what you push through it. A USB-C charger
doesn't just push power. Before anything flows, it lists the voltages it
can supply, the device picks one, and they renegotiate if the device's
needs change. If something shorts, the charger cuts out instead of frying
the phone. Nobody plugs in a laptop and calls `sendTwentyVolts()`.

That's React. You don't call `Order()`. You plug in `<Order />`, and React
works out when to render it, how much of the screen to update, and what to
do if it breaks. And just as every USB-C device carries its own Power
Delivery chip that speaks the same standard, every renderer carries its
own copy of React's engine. That's why `react` and `react-dom` have to be
the exact same version: they're two ends of one handshake.

Like every analogy, this one leaks. A charger sends the same power to
every device, but your components don't come out the same everywhere: you
still write `<div>` for a browser and `<View>` for a phone. What carries
over is everything you import from `react`: state, hooks, context and the
rules. React's own slogan for this is "learn once, write anywhere", a nod
to Java's "write once, run anywhere". The difference between the two is
the point.

## The short version

React doesn't own your whole app. It has no router, no data cache, no
styling and no build setup, which is why people call it a library. But for
the parts it does own, it's much more than UI:

- **A programming model.** UI is a function of state. You describe what the
  screen should show, and React works out how to get there.
- **A core, `react`, that doesn't know about any screen,** plus renderers
  that do: `react-dom` for browsers, `react-native` for phones, and others
  for terminals, PDFs and 3D.
- **A runtime with a scheduler.** React calls your components, you don't,
  and it decides when, how often and how urgently.
- **Protocols for the hard parts:** Suspense for waiting, error boundaries
  for failures, Actions for changing data, effects for the outside world.
- **A split between server and client** that frameworks and bundlers
  implement.
- **A compiler** that depends on all of the above.

Next.js, React Router, TanStack Start and Expo are built on these pieces.
The rest of this post takes them one at a time.

## React ships no UI

Here's the odd thing about the "UI library" label: React doesn't come with
any UI. No button, no date picker, no modal, not one line of CSS.
{>> not one button. I looked. <<}

Bootstrap and Material UI really are UI libraries. You install them to get
components that look a certain way. You install React and get none.

What React gives you instead is a way to describe UI, and to keep that
description in sync with your data:

```jsx title="order.jsx"
function Order({ items }) {
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0)

  return (
    <section>
      <h3>Table 4</h3>
      <ul>
        {items.map((item) => (
          <li key={item.name}>
            {item.qty} × {item.name}
          </li>
        ))}
      </ul>
      <p>Total: Rs {total}</p>
    </section>
  )
}
```

Nothing in this component draws anything. It returns plain objects, React
elements, that describe a section with a heading, a list and a paragraph.
I covered what those objects look like in
[How React works under the hood](/writing/how-react-works). What matters
here is what's missing: no `document`, no `appendChild`, no mention of a
browser at all. Something else has to turn the description into pixels.

## The DOM is just one target

Every React app has two layers. On the web you rarely notice, because they
arrive together: `npm install react react-dom`. But they're two different
packages with two different jobs.

<figure class="scene">
<stick-scene scene="react-charger" data-src="/scenes/react-charger.js" play="view"></stick-scene>
<figcaption>React is the charger. The same plug fits a browser, a phone, a terminal and a PDF, and each answers with its own building block (&lt;div&gt;, &lt;View&gt;, &lt;Box&gt;, &lt;Page&gt;) to draw the same order its own way. Click to play it again.</figcaption>
</figure>

### Two layers: `react` and a renderer

| Layer | Package | What it does | Knows about the screen? |
| --- | --- | --- | --- |
| The React API | `react` | Components, JSX elements, hooks (`useState`, `useEffect`, `use`), context, `Suspense`, `Activity` | No |
| A renderer | `react-dom`, `react-native`, `ink`, `@react-pdf/renderer` and others | Calls your components, keeps their state, works out what changed, and creates, updates and removes real things: DOM nodes, native views, terminal text, PDF pages | Yes, one kind of output each |

You need both. `react` on its own can describe a UI but can't show it
anywhere, and a renderer on its own has nothing to show. Each renderer
carries its own copy of React's reconciler, the engine that calls your
components and compares renders. That's why React 19 refuses to run if
`react` and `react-dom` aren't exactly the same version:[^versions]
they're two halves of one engine.

A rule of thumb follows from the split. **If you import it from `react`,
it works in every renderer. If you import it from a renderer, it only
works there.** `useState` and `useEffect` come from `react`, so they work
everywhere. `createPortal` and `useFormStatus` come from `react-dom`,
because portals into DOM nodes and HTML forms only exist on the web.

### The same app with `react-dom` and `react-native`

The clearest way to see the split is to build one small app twice. The
ordering logic goes in a file that imports only from `react`:

```js title="shared/order.js (imports only from react)"
import { useState } from "react"

export const menu = [
  { name: "Buff momo", price: 220, qty: 1 },
  { name: "Masala tea", price: 60, qty: 2 },
]

export function totalOf(items) {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0)
}

export function useOrder(initialItems) {
  const [items, setItems] = useState(initialItems)

  function addOne(name) {
    setItems((current) =>
      current.map((item) =>
        item.name === name ? { ...item, qty: item.qty + 1 } : item
      )
    )
  }

  return { items, total: totalOf(items), addOne }
}
```

In a browser, `react-dom` turns it into HTML elements:

```jsx title="web/main.jsx (react + react-dom)"
import { createRoot } from "react-dom/client"
import { menu, useOrder } from "../shared/order"

function Order() {
  const { items, total, addOne } = useOrder(menu)

  return (
    <section className="order">
      <ul>
        {items.map((item) => (
          <li key={item.name}>
            {item.qty} × {item.name}
          </li>
        ))}
      </ul>
      <p>Total: Rs {total}</p>
      <button onClick={() => addOne("Masala tea")}>One more tea</button>
    </section>
  )
}

createRoot(document.getElementById("root")).render(<Order />)
```

On a phone, `react-native` turns it into native iOS and Android views:

```jsx title="native/App.jsx (react + react-native)"
import { AppRegistry, Pressable, StyleSheet, Text, View } from "react-native"
import { menu, useOrder } from "../shared/order"

function Order() {
  const { items, total, addOne } = useOrder(menu)

  return (
    <View style={styles.order}>
      {items.map((item) => (
        <Text key={item.name}>
          {item.qty} × {item.name}
        </Text>
      ))}
      <Text>Total: Rs {total}</Text>
      <Pressable style={styles.button} onPress={() => addOne("Masala tea")}>
        <Text>One more tea</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  order: { padding: 16, gap: 8 },
  button: { padding: 12, borderWidth: 1, borderRadius: 999 },
})

AppRegistry.registerComponent("Order", () => Order)
```

The hook, the state, the updater function and the keyed list are
identical. Nearly everything else is different:

| | `react-dom` (web) | `react-native` (iOS, Android) |
| --- | --- | --- |
| Shared, from `react` | `useState`, `useEffect`, context, Suspense, your own hooks | The same |
| Building blocks | Lowercase HTML tags: `div`, `p`, `button`, `input` | Components you import: `View`, `Text`, `Pressable`, `TextInput` |
| Text | Can go almost anywhere | Must be inside `<Text>` |
| Events | `onClick`, `onChange` | `onPress`, `onChangeText` |
| Styling | CSS files and `className` | Style objects with `StyleSheet`, flexbox on every view |
| Starting the app | `createRoot(el).render(<App />)` | `AppRegistry.registerComponent` (Expo does it for you) |
| What appears | DOM nodes in a browser | Real native views: `UIView` on iOS, `android.view.View` on Android |
| Server rendering | `react-dom/server` turns components into HTML | None: the app runs on the device |

Two more details are worth knowing:

- **`react-dom` has two halves.** `react-dom/client` runs in the browser
  (`createRoot`, `hydrateRoot`). `react-dom/server` runs on a server or at
  build time (`renderToReadableStream`, `prerender`) and produces HTML.
  Frameworks like Next.js and TanStack Start use the server half to send
  real HTML first, then the client half takes over.
- **`react-native-web` goes the other way.** It implements `View`, `Text`
  and the rest on top of `react-dom`, so React Native code can run in a
  browser. That's how Expo apps get a web version from the same code.

### A package for every target

The web and phones are the big two, but there are many more. In the last
column is the distinction that matters most: some projects are renderers
of their own, with their own building blocks, and some are component kits
that run on top of `react-dom`.

| Target | Package | You write | How it renders |
| --- | --- | --- | --- |
| Web pages | `react-dom` | `div`, `p`, `button` | Its own renderer, for the DOM |
| HTML on a server | `react-dom/server` | `div`, `p`, `button` | The same renderer, producing HTML text |
| iOS and Android | `react-native`, often with Expo | `View`, `Text`, `Pressable` | Its own renderer, for native views |
| Windows and macOS apps | `react-native-windows`, `react-native-macos` | `View`, `Text`, `Pressable` | React Native's renderer, maintained by Microsoft |
| React Native code in a browser | `react-native-web` | `View`, `Text`, `Pressable` | On top of `react-dom` |
| Terminal | `ink` | `Box`, `Text` | Its own renderer, for terminal text |
| PDF files | `@react-pdf/renderer` | `Document`, `Page`, `View`, `Text` | Its own renderer, for PDF pages |
| 3D and WebGL | `@react-three/fiber` | `mesh`, `boxGeometry`, `directionalLight` | Its own renderer, for three.js objects |
| 2D canvas | `react-konva` | `Stage`, `Layer`, `Rect`, `Circle` | Its own renderer, for Konva shapes |
| Email | `react-email` | `Html`, `Body`, `Text`, `Button` | On top of `react-dom/server` |
| Video | `remotion` | `AbsoluteFill`, `Sequence`, plus HTML | On top of `react-dom`, captured frame by frame |

Here's what a few of them look like, reusing the same shared file where it
makes sense.

**Terminal, with Ink.** Claude Code and Google's Gemini CLI, two AI coding
tools that live in the terminal, draw their interfaces with React
components.[^claude-code] Here's the order as a terminal app. It reuses
`useOrder` without changing a line:
{>> the terminal you code in might be React too <<}

```jsx title="terminal/order.jsx (react + ink)"
import { Box, Text, render, useInput } from "ink"
import { menu, useOrder } from "../shared/order"

function Order() {
  const { items, total, addOne } = useOrder(menu)

  useInput((input) => {
    if (input === "t") addOne("Masala tea")
  })

  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      {items.map((item) => (
        <Text key={item.name}>
          {item.qty} × {item.name}
        </Text>
      ))}
      <Text bold>Total: Rs {total}</Text>
      <Text dimColor>Press t for one more tea</Text>
    </Box>
  )
}

render(<Order />)
```

That's three renderers and one hook. State, updater functions and keys
behave the same in a browser, on a phone and in a terminal, because they
come from `react`, not from the renderer.

**PDF, with React PDF.** There's nothing to click in a PDF, so this one
only reuses `menu` and `totalOf`. It runs in Node, as here, or in the
browser through a `<PDFDownloadLink>`:

```jsx title="pdf/invoice.jsx (react + @react-pdf/renderer)"
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToFile,
} from "@react-pdf/renderer"
import { menu, totalOf } from "../shared/order"

function Invoice({ items }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Invoice #1042</Text>
        {items.map((item) => (
          <View key={item.name} style={styles.row}>
            <Text>
              {item.qty} × {item.name}
            </Text>
            <Text>Rs {item.price * item.qty}</Text>
          </View>
        ))}
        <Text>Total: Rs {totalOf(items)}</Text>
      </Page>
    </Document>
  )
}

const styles = StyleSheet.create({
  page: { padding: 40 },
  title: { fontSize: 18, marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between" },
})

await renderToFile(<Invoice items={menu} />, "invoice-1042.pdf")
```

Notice that `View`, `Text` and `StyleSheet` here come from React PDF, not
React Native. Same names, different renderer, different output. The
import line tells you which world you're in.

**Email, with React Email.** Email clients only understand a narrow,
old-fashioned kind of HTML. React Email's components produce it, and its
`render` function turns them into an HTML string, using
`react-dom/server` underneath:[^react-email]

```jsx title="email/receipt.jsx (react + react-email)"
import { Body, Button, Html, Text, render } from "react-email"
import { menu, totalOf } from "../shared/order"

function Receipt({ items }) {
  return (
    <Html>
      <Body>
        <Text>Thanks for eating with us. Your total was Rs {totalOf(items)}.</Text>
        <Button href="https://example.com/orders/1042">View your receipt</Button>
      </Body>
    </Html>
  )
}

const html = await render(<Receipt items={menu} />)
// Send `html` with any email provider.
```

**3D, with React Three Fiber.** This one shows that two renderers can work
in one app. `<Canvas>` is a DOM element, rendered by `react-dom`.
Everything inside it is rendered by React Three Fiber into three.js
objects, and hooks work on both sides:

```jsx title="scene.jsx (react + react-dom + @react-three/fiber)"
import { useRef, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"

function SpinningBox() {
  const mesh = useRef(null)
  const [hovered, setHovered] = useState(false)

  // Runs on every animation frame.
  useFrame((state, delta) => {
    mesh.current.rotation.y += delta
  })

  return (
    <mesh
      ref={mesh}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? "orange" : "royalblue"} />
    </mesh>
  )
}

export function Scene() {
  return (
    <Canvas>
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 2, 2]} />
      <SpinningBox />
    </Canvas>
  )
}
```

`mesh` and `boxGeometry` look like HTML tags, but they aren't. A lowercase
name means "a building block of whatever this renderer draws". For
`react-dom`, `div` becomes a DOM node. For React Three Fiber, `mesh`
becomes a `THREE.Mesh`.

**Video, with Remotion,** works like React Email: it sits on top of
`react-dom`. Your components read the current frame number with
`useCurrentFrame()`, Remotion renders each frame in a headless browser,
and the frames are encoded into an MP4.

### How to tell them apart

When you meet a new React package, three questions sort it out:

1. **Where does the output go?** DOM nodes, native views, terminal text,
   a PDF, a 3D scene or an HTML string.
2. **Is it a renderer, or built on `react-dom`?** A renderer has its own
   building blocks and its own way to start (`createRoot`,
   `AppRegistry`, Ink's `render`, `renderToFile`). A kit on top of
   `react-dom` gives you components, and `react-dom` still does the
   rendering.
3. **What can I share?** Anything that imports only from `react`: hooks,
   context and plain logic, like `shared/order.js` above. The building
   blocks don't travel. `<div>`, `<View>` and `<mesh>` each mean something
   only to their own renderer.

### Try it: one component, two outputs

The playground below renders the same `Order` twice. On the left,
`react-dom` turns it into DOM nodes. On the right, a toy renderer of about
fifteen lines walks the same element objects and turns them into terminal
text. Add a tea, edit `Order`, or teach `toText` a new tag.
{>> please don't ship this one <<}

```jsx playground title="one-order-two-outputs.jsx" network="none"
import { useState } from "react"

// An ordinary component. Nothing in it mentions the DOM.
function Order({ items }) {
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0)

  return (
    <section>
      <h3>Table 4</h3>
      <ul>
        {items.map((item) => (
          <li key={item.name}>
            {item.qty} × {item.name}: Rs {item.price * item.qty}
          </li>
        ))}
      </ul>
      <p>Total: Rs {total}</p>
    </section>
  )
}

// A toy renderer. It walks the element objects that react-dom also gets,
// and turns them into terminal text instead of DOM nodes.
function toText(node) {
  if (node == null || typeof node === "boolean") return ""
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(toText).join("")

  const { type, props } = node
  // A component: call it to find out what it describes. (Real renderers
  // let React call it, so hooks and state work. This toy can't do hooks.)
  if (typeof type === "function") return toText(type(props))

  const inside = toText(props.children)
  if (type === "h3") return `${inside.toUpperCase()}\n${"─".repeat(inside.length)}\n`
  if (type === "li") return `  • ${inside}\n`
  if (type === "p") return `\n${inside}\n`
  return inside
}

export default function App() {
  const [items, setItems] = useState([
    { name: "Buff momo", price: 220, qty: 1 },
    { name: "Masala tea", price: 60, qty: 2 },
  ])

  function addTea() {
    setItems((current) =>
      current.map((item) =>
        item.name === "Masala tea" ? { ...item, qty: item.qty + 1 } : item
      )
    )
  }

  const order = <Order items={items} />

  return (
    <>
      <button onClick={addTea}>One more tea</button>
      <section
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(13rem, 1fr))",
        }}
      >
        <div>
          <small>react-dom: DOM nodes</small>
          {order}
        </div>
        <div>
          <small>toText: terminal text</small>
          <pre
            style={{
              margin: 0,
              padding: 12,
              border: "1px solid var(--line)",
              borderRadius: 10,
            }}
          >
            {toText(order)}
          </pre>
        </div>
      </section>
    </>
  )
}
```

The toy cheats. It calls components as plain functions, so they can't use
hooks, and it rebuilds all of the text on every change. A real renderer is
built on the `react-reconciler` package, and its job is much narrower than
you'd expect. It only answers questions about its own world: how do I
create a node, add a child, update some props, remove a node? Simplified,
it looks like this:

```js title="a custom renderer (simplified)"
import Reconciler from "react-reconciler"

const renderer = Reconciler({
  createInstance(type, props) {
    // Make a node in your world: a terminal box, a 3D mesh, a PDF page.
  },
  createTextInstance(text) {},
  appendChild(parent, child) {},
  insertBefore(parent, child, beforeChild) {},
  removeChild(parent, child) {},
  commitUpdate(node, type, oldProps, newProps) {
    // Apply the props that changed.
  },
  // …and a few dozen more
})
```

Everything else comes from React itself: components, state, hooks, keys,
reconciliation, batching, Suspense and transitions. That's why hooks work
the same in React Native as in a browser. They were never part of the DOM
layer to begin with.

## You don't call React. React calls you.

There's a classic way to tell a library from a framework: you call a
library, and a framework calls you. Lodash is a library. You call
`debounce` when you want to. With React, you never call `Order()`
yourself. You hand React an element, `<Order items={items} />`, and React
decides when to call the function, how many times, and what to do with
the result. The React docs make it a rule:
[React calls Components and Hooks](https://react.dev/reference/rules/react-calls-components-and-hooks).
{>> the Hollywood principle: don't call us, we'll call you <<}

Here's what React does with that control:

- **It batches.** Three state updates in one click handler cause one
  render, not three.
- **It sets priorities.** A keystroke is urgent. Re-filtering a long list
  inside a transition can wait, and React drops a half-finished render if
  something more urgent comes in. I showed this in
  [Async React explained](/writing/async-react).
- **It may render twice, or for nothing.** Strict Mode calls your
  components twice in development to catch impure code, and a render that
  React throws away never reaches the screen.
  {>> the double console.log mystery, solved <<}
- **It manages lifetimes, not just looks.** `<Activity>`, added in React
  19.2, hides part of the tree without destroying it.

That last one is easy to feel. Type a note, open Help, then go back to
Write. Then tick the checkbox and try again:
{>> ten seconds, I promise <<}

```jsx playground title="tabs.jsx" network="none"
import { Activity, useState } from "react"

export default function App() {
  const [keepAlive, setKeepAlive] = useState(false)
  const [tab, setTab] = useState("write")

  return (
    <>
      <label>
        <input
          type="checkbox"
          checked={keepAlive}
          onChange={(e) => setKeepAlive(e.target.checked)}
        />
        Hide the Write tab with {"<Activity>"} instead of removing it
      </label>
      <p style={{ display: "flex", gap: 8, margin: 0 }}>
        <button aria-pressed={tab === "write"} onClick={() => setTab("write")}>
          Write
        </button>
        <button aria-pressed={tab === "help"} onClick={() => setTab("help")}>
          Help
        </button>
      </p>

      {keepAlive ? (
        <Activity mode={tab === "write" ? "visible" : "hidden"}>
          <Draft />
        </Activity>
      ) : (
        tab === "write" && <Draft />
      )}

      {tab === "help" && <p>Notes are saved in the Write tab. Or are they?</p>}
    </>
  )
}

function Draft() {
  const [text, setText] = useState("")
  return (
    <label>
      Your note
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type something"
      />
    </label>
  )
}
```

Without `<Activity>`, switching tabs unmounts the draft, and its state goes
with it. With it, React hides the subtree with `display: none`, cleans up
its effects while it's hidden, and keeps its state for when you come back.
Updates inside the hidden part wait until React has nothing more urgent to
do. That isn't drawing. That's a runtime deciding what's alive, what's
asleep and what can wait.

And this is where the rules come from. React may pause a render, throw it
away or run it twice, so render has to be pure. React finds your hooks by
the order you call them, so they can't hide behind an `if`. These aren't
style preferences. They're what a scheduler needs from the code it runs.

## Protocols for waiting, failing and changing data

A UI library gives you a spinner. React gives you rules for who shows the
spinner, and when.

- **Suspense is a protocol for "not ready yet".** Any component can
  suspend: while its code loads (`lazy`), while its data loads
  (`use(promise)`), or while the server is still streaming its part of the
  page. The nearest `<Suspense>` boundary above it shows a fallback. The
  component that waits doesn't know who shows the fallback, and the
  boundary doesn't know what it's waiting for.
- **Error boundaries are the same protocol for failures.** When a component
  throws while rendering, the nearest boundary above it catches the error,
  however deep the component is.
- **Actions are a protocol for changing data.** An async function passed
  to `<form action>`, `useActionState` or `startTransition` gets pending
  state and error handling from React, and `useOptimistic` shows the result
  before the server has confirmed it.
- **Effects are the protocol for the outside world.** The docs describe
  `useEffect` as a way to synchronize a component with an external system,
  like a socket, a map widget or a browser API. `useSyncExternalStore`
  does the same for stores that live outside React.

None of these draw anything. They decide who's responsible for what when
something is slow, broken or out of date.

## React crosses the network

A UI library has no opinion about your server. React has had one since
React 19 made Server Components stable:

- **`"use client"` and `"use server"` mark boundaries in your code:**
  which files run in the browser, and which functions the browser may call
  on the server. Bundlers like webpack, Vite and Parcel implement those
  boundaries.
- **Server Components send their output in React's own streaming format,**
  the RSC payload, and the browser merges it into the page without losing
  state like typed text or scroll position.
- **Server Functions turn a function call into a network request,** so a
  button can call the server without you writing an API route.

That's a contract between a server, a bundler and a browser, and React
defines it. I wrote a whole post on
[what React Server Components fix](/writing/react-server-components), and
what they don't.

## React has a compiler

React Compiler 1.0 shipped in October 2025. It runs at build time, reads
your components and hooks, and adds the memoization you used to write by
hand with `memo`, `useMemo` and `useCallback`.
{>> useCallback, we had a good run <<}

A compiler can only optimize code that follows known rules, and the
[Rules of React](https://react.dev/reference/rules) are exactly that:
components and hooks are pure, props and state are treated as immutable,
hooks are called at the top level. When a component breaks a rule, the
compiler skips it instead of guessing, and the ESLint plugin tells you
why. A library with a compiler and a written spec for the code it
compiles has started to look a lot like a language.

## A platform, not a package

Two more signs that React has outgrown the word "library":

- **The React docs tell you to start with a framework.** The
  [Creating a React App](https://react.dev/learn/creating-a-react-app) page
  recommends one, such as Next.js, React Router or Expo, and Create React
  App was deprecated in February 2025. React defines the pieces.
  Frameworks add routing, data loading and a build setup, and wire them to
  React's server and streaming features.
- **React belongs to a foundation now.** In February 2026, React, React
  Native and JSX moved from Meta to the
  [React Foundation](https://react.dev/blog/2026/02/24/the-react-foundation),
  hosted by the Linux Foundation, and backed by eight companies.[^foundation]
  That's the kind of home you give infrastructure that a lot of companies
  depend on.

## So, is React a library or a framework?

I gave the short answer at the top. Here's the longer one: both answers
are partly right, which is why the argument never ends.
{>> you can stop arguing now. (you won't.) <<}

- **It's a library in what it leaves out.** React doesn't choose your
  router, data layer, styling or build tool, and you can drop it into one
  corner of an existing page.
- **It's a framework in what it owns.** React calls your code, decides when
  it runs, and sets rules that your code has to follow.

That's why I'd call it neither: it's the UI runtime from the start of
this post. The name comes from Dan Abramov's 2019 essay
[React as a UI Runtime](https://overreacted.io/react-as-a-ui-runtime/).
Since that essay, the runtime has grown to cover the server, a wire format
and a compiler.

## Where "just a UI library" still fits

The bigger React has real costs:

- **There's more to learn.** Knowing React used to mean components, props
  and state. Now it can also mean transitions, Suspense, the server
  boundary, Actions and the compiler. You don't need all of it on day one,
  but your framework may push you into some of it early.
- **You still assemble the app.** React won't pick your router, form
  library or styling. A framework picks some of them for you, and each
  choice is one more thing to learn.
- **It isn't always the right tool.** A single static page doesn't need a
  runtime at all. Plain HTML and CSS will do, as I argued in
  [How to choose a frontend framework](/writing/choosing-a-frontend-stack).

## What to take from it

- **Learn the model, not the list of APIs.** Components describe output,
  React calls them, and state is a snapshot. Once those click, each new API
  is a variation on them.
- **Read the rules as a contract.** Pure render and stable hook order are
  what the scheduler and the compiler need from you.
- **What you learn travels.** The same components and hooks work in a
  browser, a phone app, a terminal tool or a PDF generator.
- **Let a framework fill in the rest.** React owns rendering and timing.
  Routing, data and builds are someone else's job, on purpose.

That's the whole idea. React was never just the V in MVC. It was a
runtime all along. It just took a phone, a terminal and a PDF to make that
obvious.

## Acknowledgements

- Dan Abramov's
  [React as a UI Runtime](https://overreacted.io/react-as-a-ui-runtime/),
  still the best long read on this idea, and where this post's answer
  comes from.
- The React docs, especially the
  [Rules of React](https://react.dev/reference/rules) and
  [Creating a React App](https://react.dev/learn/creating-a-react-app).
- The people behind Ink, React PDF, React Three Fiber, React Email and
  [react-reconciler](https://github.com/facebook/react/tree/main/packages/react-reconciler),
  who made "more than UI" real.
- Benji's [Family Values](https://benji.org/family-values), whose margin
  notes and footnotes this post borrows.
- Kamran Ahmed's
  [stick-scene](https://github.com/nilbuild/stick-scene), which draws the
  stick figures.

[^v-in-mvc]: From the "Just the UI" section of React's original homepage.
For years the tagline was "A JavaScript library for building user
interfaces". Today react.dev says "The library for web and native user
interfaces."

[^usb-c]: The EU made USB-C the required charging port for new phones,
tablets, headphones and other small devices from 28 December 2024, and for
new laptops from 28 April 2026.

[^versions]: The error reads: "Incompatible React versions: The "react"
and "react-dom" packages must have the exact same version."

[^claude-code]: Outside write-ups of Claude Code describe its own fork of
Ink rather than the npm package. Either way, its interface is React
components drawn by a terminal renderer.

[^react-email]: React Email used to be split into packages like
`@react-email/components` and `@react-email/render`. Since version 6,
everything comes from the single `react-email` package, and
`@react-email/components` is deprecated.

[^foundation]: The founding members are Amazon, Callstack, Expo, Huawei,
Meta, Microsoft, Software Mansion and Vercel.
