---
title: "WebMCP: give AI agents tools, not screenshots"
description: "The problem WebMCP solves, where it helps, why SEOs care about it, and how to add tools with document.modelContext or plain HTML forms."
date: "2026-11-16"
tags: ["webmcp", "ai", "seo", "javascript"]
---

More and more people ask an AI agent to do things on the web for them: find
a flight, reorder groceries, file a support ticket. The agent opens the site
in a browser and gets to work. The trouble is how it gets to work.

## The problem: agents are guessing

Websites are built for people. An agent using one has two options, and both
are guesswork:

- **Look at screenshots.** Take a picture of the page, guess which pixels
  are a button, click, then take another picture to see what happened.
- **Read the DOM.** Wade through thousands of nodes of markup and work out
  which `<div>` is secretly a dropdown.

Take a request like _"find me a flight from Kathmandu to Delhi on Friday,
under $200."_ On a typical travel site, the agent has to:

1. Find the "From" field and type "Kathmandu".
2. Wait for the autocomplete list and pick the right airport.
3. Do the same for "To".
4. Open a custom date picker and page forward to the right month.
5. Search, wait, then find the price filter and drag its slider.
6. Read the prices back off the screen.

Every step is a model call and a guess. That makes the whole thing:

- **Slow and expensive.** Many round trips, most of them carrying a
  screenshot.
- **Fragile.** A redesign, an A/B test or a cookie banner moves a button, and
  the flow breaks.
- **Ambiguous.** Does "Continue" go to the next step, or charge the card?
  The agent can't tell.
- **Lossy.** Prices and dates are read back from pixels, so a result can be
  wrong without anyone noticing.

The fragility compounds, because a run only succeeds if every step does.
Say the agent gets each step right
<span class="scrub" data-figure="agent-steps" data-key="p"></span> of the
time, and the flight search takes
<span class="scrub" data-figure="agent-steps" data-key="steps"></span> steps.
Here are 100 agents trying it:

<figure class="explorable" id="agent-steps" aria-label="A bar chart of 100 agent runs. Bars show how many runs are still going after each step of driving the UI, next to a single bar for one tool call."></figure>

Each step only fails now and then, but the chance of finishing is the
per-step rate multiplied by itself once per step: 0.95 to the power of 12 is
about 54%, so roughly half the runs never book anything. A tool call is one
step. Even at
<button class="set" data-figure="agent-steps" data-set="p=99">99% per
step</button>, a 12-step flow fails about one run in nine, while the tool
call fails one in a hundred.

## What WebMCP changes

WebMCP is a proposed web standard that lets a site say what it can do,
instead of making the agent work it out. A page registers **tools**:
functions with a name, a description and a JSON Schema for their input. An
agent in the browser reads that list and calls a function directly.

The same flight search becomes a single call:

<div class="compare">
  <div class="dont">
    <p class="label">Agent drives the UI</p>
    <p>Screenshot, find the field, type, wait for the dropdown, pick, open
    the date picker, page through months, filter, then read prices off the
    screen. Every step is a guess.</p>
  </div>
  <div class="do">
    <p class="label">Agent calls a tool</p>
    <p><code>search_flights</code> with <code>from: "KTM"</code>,
    <code>to: "DEL"</code>, a date and <code>maxPrice: 200</code>. The site
    returns the matching flights as data and shows the same results on the
    page.</p>
  </div>
</div>

The tool runs inside the page, with the user's session, in the tab they are
looking at. They watch the results appear, and anything with consequences,
like paying, sending or deleting, can still wait for them to confirm.

- **Faster:** one call instead of a chain of guesses.
- **Reliable:** a tool doesn't care where the button moved.
- **Explicit:** the site decides which actions exist and what they need.
- **Safer:** risky tools can be flagged, and forms can leave the final
  submit to the user.

### Isn't that just MCP?

Same idea, different place. An MCP server runs on your backend. It works
without a browser, but it needs its own authentication and lives apart from
your UI. WebMCP tools run in the page: they use the session the user is
already signed in with, they update the interface the user is looking at,
and they exist only while the page is open. Plenty of sites will want both:
an MCP server for headless integrations, and WebMCP for an agent working
alongside a person in the browser.

## Where it's useful

Chrome's [use cases](https://developer.chrome.com/docs/ai/webmcp/use-cases)
fall into three jobs:

- **Buying things.** Search a store, compare prices, build a wishlist.
  _"Reorder the cheese sticks I bought last month"_ becomes an order-history
  tool plus an add-to-cart tool. The user still reviews the cart and pays.
- **Filling in forms.** Timesheets, warranty claims, catering quotes. The
  agent fills the fields from the conversation, asks for anything missing,
  and the user submits.
- **Filtering information.** Apartments with three bedrooms near a train
  line, hotels under $300 with a pool and breakfast, used cars with seven
  seats. The site's own search and filters become tools, so the criteria map
  straight onto them.

Beyond those, it fits anywhere the interface is the hard part: dashboards
with dozens of filters, admin panels, booking flows, and content sites where
an agent should search the posts rather than crawl them.

It is not worth it everywhere. A page that only needs to be read is already
covered by clean HTML and structured data. And some tasks are about the
person choosing, like browsing for a gift until something catches their
eye. There, the agent should step aside.

## Why SEOs care

Dan Petrovic called WebMCP
["the biggest shift in technical SEO since structured data"](https://dejan.ai/blog/webmcp/).
The comparison is worth unpacking.

Before structured data, search engines had to infer what a page meant.
Schema markup let a site say it outright: this is a recipe, this is a
product at this price and in stock, this is an event on this date at this
place. Results got more accurate, and it opened the door to rich results.

WebMCP does the same for the **action layer** instead of the information
layer. Agents used to infer what they could do on a site. With WebMCP, the
site declares which actions exist and how to run them. Structured data tells
machines what a page _is_; WebMCP tells them what it can _do_.

If the comparison holds, well-built tools will become a sign that a site is
ready for the agentic web, the way correct schema has long been a sign that
a site is ready for semantic search. That is a prediction, not a ranking
factor. The payoff today is simpler: agents that use your site actually
succeed.

## Where it stands

- The [spec](https://webmachinelearning.github.io/webmcp/) is a Draft
  Community Group Report from the W3C Web Machine Learning Community Group,
  edited by people from Google and Microsoft. It is not a W3C standard yet.
- Chrome is running an origin trial that started in Chrome 149. For local
  testing, turn on `chrome://flags/#enable-webmcp-testing`.
- The entry point moved from `navigator.modelContext` to
  `document.modelContext`, and only exists on HTTPS pages.
- `provideContext()` and `unregisterTool()` are no longer in the spec. You
  register tools one at a time and remove them with an `AbortSignal`.

Many tutorials from earlier this year still show the old API. Treat all of
it as progressive enhancement: feature-detect, and make sure the page works
the same without it.

## Registering a tool

The imperative API is one call. Here is a search tool for a blog like this
one:

```js title="search-posts.js"
if ("modelContext" in document) {
  await document.modelContext.registerTool({
    name: "search_posts",
    title: "Search posts",
    description:
      "Finds posts by keyword. Returns titles, dates and URLs, newest first.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Words to search for, as the user said them",
        },
      },
      required: ["query"],
    },
    annotations: { readOnlyHint: true },
    async execute({ query }, { signal }) {
      const matches = await searchPosts(query, { signal })
      if (matches.length === 0) {
        return `No posts match "${query}". Try a broader word, such as "css".`
      }
      return matches
        .map((post) => `${post.title} (${post.date}): ${post.url}`)
        .join("\n")
    },
  })
}
```

A few things worth knowing:

- **`name` is what the agent calls, `description` is how it decides to.**
  Both are effectively prompts. Write them for a model that has never seen
  your site.
- **`inputSchema` is plain JSON Schema.** The agent fills it in from the
  conversation.
- **`execute` gets an `AbortSignal`** that fires if the call is cancelled.
  Pass it on to `fetch` and anything else that can stop early.
- **Return text the model can act on.** An empty result with a hint lets it
  retry instead of giving up.
- **`annotations` say what kind of tool this is.** `readOnlyHint` for tools
  that only read, `consequentialHint` for irreversible or high-stakes
  actions, and `untrustedContentHint` when the output includes content you
  don't control, like user comments. All of them default to `false`.

## Tools should follow the page

A tool should exist only while it makes sense. An "add to cart" tool is
useful on a product page and confusing anywhere else. Register it with a
signal and abort when the page state goes away. In React, that is an effect
cleanup:

```jsx title="product-page.jsx"
useEffect(() => {
  if (!("modelContext" in document)) return
  const controller = new AbortController()
  document.modelContext.registerTool(addToCartTool, {
    signal: controller.signal,
  })
  return () => controller.abort()
}, [])
```

Since Chrome 153, unregistering a tool no longer breaks calls that are
already running, so it is safe to clean up eagerly.

## Or just annotate a form

On a lot of sites the most useful action already exists as a form. The
declarative API turns it into a tool with a few attributes, and the browser
builds the schema for you:

```html title="contact.html"
<form
  toolname="send_message"
  tooldescription="Sends the site owner a message, for questions or work enquiries."
  action="/contact"
  method="post"
>
  <label>
    Your email
    <input type="email" name="email" required />
  </label>
  <label>
    Message
    <textarea
      name="message"
      required
      toolparamdescription="What the user wants to say, in their own words"
    ></textarea>
  </label>
  <button>Send</button>
</form>
```

- Each field is described by its `toolparamdescription`, or its `<label>`,
  or its `aria-description`, in that order. Good labels do double duty.
- When an agent calls the tool, Chrome fills in the fields, fires
  `toolactivated` on `document.modelContext`, and outlines the form and its
  submit button through the `:tool-form-active` and `:tool-submit-active`
  pseudo-classes, which you can restyle.
- **The user still clicks Send.** That is the default, and for most forms it
  is the right one. Add `toolautosubmit` only where submitting on the
  agent's word is harmless, like a search form.

To tell the agent how it went, handle the submit yourself and answer with
`respondWith()`:

```js title="contact.js"
form.addEventListener("submit", (event) => {
  event.preventDefault()
  const sent = sendMessage(new FormData(form))
  if (event.agentInvoked) {
    event.respondWith(sent.then(() => "Message sent."))
  }
})
```

## Designing tools an agent can actually use

The API is the easy part. Most of the work is the same as designing any API,
except the client is a language model:

<div class="compare">
  <div class="dont">
    <p class="label">Vague names, rules in the description</p>
    <p><code>handle_event</code>: "Event tool. Don't use this for
    reminders."</p>
  </div>
  <div class="do">
    <p class="label">A precise verb and when to use it</p>
    <p><code>create_event</code>: "Creates a calendar event at a specific
    date and time."</p>
  </div>
</div>

- **One job per tool.** If one tool creates an event and another only opens
  the form, name them `create_event` and `start_event_creation`.
- **Accept raw input.** Take "last week" as a string and do the date maths
  in your code. You are better at it than the model.
- **Validate strictly in code, loosely in schema**, as Chrome's guidance
  puts it. A schema is a hint, not a guarantee.
- **Return errors that say what to fix**, so the model can retry with valid
  input.
- **Resolve only after the UI shows the change.** The user is watching the
  same tab.
- **Keep the list short.** Every extra tool, and every overlap, makes the
  right choice harder.

## Security is still your job

A tool is an API that anything driving the browser can call, including
Chrome extensions, which can list and run tools from content scripts. Treat
it like a public endpoint:

- Check permissions and validate input inside `execute`, exactly as you
  would on the server.
- Mark irreversible actions with `consequentialHint` so agents can ask the
  user to confirm, and keep `toolautosubmit` off those forms.
- Set `untrustedContentHint` when you return text other people wrote. Tool
  output lands in a model's context, which makes it a path for prompt
  injection.
- Tools are same-origin by default and gated by the `tools` Permissions
  Policy. A cross-origin iframe needs `allow="tools"` before it can
  register any.

## Testing

- Turn on `chrome://flags/#enable-webmcp-testing` and relaunch Chrome.
- DevTools has a **WebMCP** pane in the Application panel. It lists the
  registered tools, logs every call with its input and output, and lets you
  run a tool by hand.
- The Model Context Tool Inspector extension puts a real model on the other
  end, which is the only way to find out whether your names and
  descriptions lead it to the right tool.

## Limitations

- **One browser, one trial.** It is a Chrome origin trial on a draft spec,
  and the API has already changed once this year.
- **Agents have to visit first.** Tools exist only on an open page, so an
  agent can't discover what a site offers without loading it.
- **Built for a person in the loop.** It can run headless, but it is
  designed for an agent working in a browser alongside its user.
- **Complex apps may need refactoring** before their actions can be exposed
  as clean, single-purpose tools.

## Is it worth it yet?

I would not build anything that depends on it. But done as progressive
enhancement, it costs very little: a couple of attributes on a form you
already have, or a feature-detected `registerTool()` next to code you
already wrote. And the exercise is useful on its own. Deciding what the real
actions on a page are, what input they need and what they should return
makes the page clearer for people too.

The worst case is a few attributes nobody reads. The best case is that
agents use your site the way you designed it, instead of the way a
screenshot suggests. The
[Chrome docs](https://developer.chrome.com/docs/ai/webmcp) are the best
place to start.
