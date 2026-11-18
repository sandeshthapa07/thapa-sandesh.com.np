---
title: "AI made \"it works\" cheap. Does anyone still care about the details?"
description: "When AI can build a working app in an afternoon, do the small things still matter? Details people feel, AI products that worked but missed one, and why the answer is to craft the system that gets details right."
date: "2026-11-18"
tags: ["ai", "craft", "ux", "frontend"]
---

Ask an AI to build a checkout page and you'll have one in a minute. It has
a form, a button and a success message. You can click through it. It works.

So here is a question I keep coming back to: if anyone can get to "it
works" in a minute, does anybody still care about the details? The spacing,
the error message, what happens when you click twice, how the price is
written?

My answer is yes, but not the way people usually say it. Nobody notices
good details. Everybody notices missing ones. And now that AI does the
first 90% for free, the last 10% is most of what's left.

This post covers what "details" means in practice, the ones people feel
without being able to name them, AI products that worked fine and still
failed on one, and the question underneath all of it: should the system
just work, or do you have to craft it?

## The quick answer

- **Do people care?** Rarely out loud. Nobody writes "nice error message"
  in a review. They feel it as "this feels solid" or "this feels cheap",
  and they act on it: they trust it, come back, or leave.
- **Why it matters more now:** AI made "it works" cheap. When everyone can
  ship something that works, working stops being the difference.
- **Which details:** not all of them. Spend your care where a mistake costs
  someone money, data, time or trust: payments, forms, errors, loading
  states, and anything an AI agent is allowed to do on its own.
- **System or craft?** Both, in that order. Craft the system so the boring
  details are right by default, for you, your team and your AI tools. Then
  spend your own attention on the details no system can decide.

## What "it works" means now

AI is very good at the happy path: the demo where the network is fast, the
input is valid, the user clicks once and nothing fails. Real people aren't
the demo. They're on a phone with one bar of signal. They double-click.
They paste a phone number with spaces in it. They have a 40-character name,
or they write it in Devanagari.

The gap between "works in the demo" and "works for people" is made of
details. Here's a pay button the way you usually get it, and the same
button with the details. The checkbox switches between them:

```jsx playground title="pay-button.jsx" network="slow"
import { useState } from "react"
import { placeOrder } from "./api"

export default function App() {
  const [careful, setCareful] = useState(false)
  return (
    <>
      <label>
        <input
          type="checkbox"
          checked={careful}
          onChange={(e) => setCareful(e.target.checked)}
        />
        Sweat the details
      </label>
      {careful ? <CarefulPay key="careful" /> : <QuickPay key="quick" />}
    </>
  )
}

// What you usually get. It works, in the demo.
function QuickPay() {
  const [charges, setCharges] = useState(0)

  async function pay() {
    try {
      await placeOrder(2500)
      setCharges((count) => count + 1)
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <>
      <button onClick={pay}>Pay Rs 2,500</button>
      <p>Charged {charges} {charges === 1 ? "time" : "times"}</p>
    </>
  )
}

// The same button, with the details.
function CarefulPay() {
  // One key per checkout, so the server can refuse a second charge.
  const [key] = useState(
    () => `order-${Math.random().toString(36).slice(2, 6)}`
  )
  const [status, setStatus] = useState("idle")
  const [charges, setCharges] = useState(0)
  const busy = status === "paying" || status === "paid"

  async function pay() {
    setStatus("paying")
    try {
      await placeOrder(2500, key)
      setCharges((count) => count + 1)
      setStatus("paid")
    } catch {
      setStatus("failed")
    }
  }

  return (
    <>
      <button onClick={pay} disabled={busy}>
        {status === "paying"
          ? "Paying…"
          : status === "paid"
            ? "Paid"
            : "Pay Rs 2,500"}
      </button>
      {status === "failed" && (
        <p role="alert">
          The payment didn't go through. Nothing was charged, so it's safe
          to try again.
        </p>
      )}
      <p>Charged {charges} {charges === 1 ? "time" : "times"}</p>
    </>
  )
}
```

Leave the box unchecked and click Pay three times quickly. Three requests
go out and you pay three times. Now press Fail requests and click again.
Nothing happens: no message, no change. The error went to the console,
where no user will ever look. Did you pay? You can't tell, so you'd
probably click again.

Check the box and do the same. The button says "Paying…" and ignores extra
clicks. When the request fails, it tells you nothing was charged and that
it's safe to retry. And every attempt sends the same key, which you can see
in the Requests log. That one is for the server: it remembers the keys it
has seen and refuses to charge the same one twice. A disabled button can't
cover every case, like a request that reached the server but whose response
got lost on the way back. [Stripe's API](https://docs.stripe.com/api/idempotent_requests)
works this way, with an `Idempotency-Key` header.

None of this is a feature. No one writes a ticket that says "don't charge
people twice". These are details, and they're the difference between an app
people trust with their money and one they don't.

## Details people feel, even if they can't name them

Most details are smaller than a double charge. Here are a few that come up
a lot, especially when you build for people in Nepal.

### Money written the way people read it

In Nepal, as in India, twenty-five lakh is written 25,00,000, not
2,500,000. AI-written code usually reaches for `toLocaleString()`, which
uses whatever locale the browser happens to have:

```js
const amount = 2500000

amount.toLocaleString("en-US") // "2,500,000"
new Intl.NumberFormat("en-IN").format(amount) // "25,00,000"
new Intl.NumberFormat("ne-NP").format(amount) // "२५,००,०००"
```

Even `en-NP` gives you 2,500,000 at the time of writing, so you can't just
pick the locale with "Nepal" in its name. A shop owner reads 25,00,000 as
twenty-five lakh at a glance. With 2,500,000 they stop and count zeros. It's
a tiny thing, on every number, on every screen.

### Time zones that aren't whole hours

Nepal is UTC+5:45. Any code that assumes offsets come in whole hours, or
adds hours by hand, is off by fifteen minutes. The clock on this site's
home page lets the browser do the maths, and reads the time only on the
client, so the prerendered HTML never shows a stale time:

```ts title="src/routes/index.tsx"
const nepalTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Kathmandu",
  hour: "numeric",
  minute: "2-digit",
})
```

### Inputs that bring up the right keyboard

```html
<!-- What you usually get -->
<input type="text" placeholder="Phone" />

<!-- With the details -->
<label for="phone">Phone</label>
<input id="phone" type="tel" autocomplete="tel" />

<label for="code">Code from SMS</label>
<input id="code" inputmode="numeric" autocomplete="one-time-code" />
```

`type="tel"` opens the number pad on a phone. `autocomplete` lets the
browser fill in the number, and `one-time-code` lets the phone offer the
code from the SMS that just arrived, so nobody has to switch apps and
memorise six digits. The label stays visible after you start typing, which
a placeholder doesn't, and screen readers can announce it. One more: iOS
Safari zooms in on any input whose text is smaller than 16px, and the page
stays zoomed after you leave the field.

### Errors that say what happened

"Something went wrong" is true and useless. A useful error says what
happened, what it means for you, and what to do next: "Your card was
declined. Nothing was charged. Try another card." It also keeps what you
typed, and it shows up next to the field that caused it, not in a toast
that disappears before you finish reading.

### And a lot of smaller ones

- **Numbers that don't wobble.** In most fonts a "1" is narrower than a
  "0", so a ticking timer shakes and a column of prices doesn't line up.
  `font-variant-numeric: tabular-nums` gives every digit the same width.
- **Layout that stays still.** An image without a `width` and `height`
  pushes the page down when it loads, and you tap the wrong thing. Google
  measures this as Cumulative Layout Shift, one of its Core Web Vitals.
- **Headings without a lonely last word.** `text-wrap: balance` evens out
  the lines of a heading. The post titles on this site use it.
- **Motion that respects people.** The theme toggle on this site reveals
  the new theme in a growing circle, unless your system is set to reduce
  motion. Then it just switches.
- **A focus ring you can see**, so someone using a keyboard knows where
  they are.
- **Empty states that help.** A new user's first screen shouldn't be a
  blank table. It should say what goes there and how to add the first one.

## When AI "worked" and a detail didn't

The stakes go up when AI is the product, or when an AI agent can act on its
own. Each of these systems worked. Each failed on a detail nobody demoed.

- **Air Canada, 2024.** The airline's website chatbot told a grieving
  passenger to book a full-price ticket and claim the bereavement discount
  afterwards. The airline's own policy page said otherwise. Air
  Canada argued the chatbot was responsible for its own actions. A
  [tribunal disagreed](https://www.timescolonist.com/local-news/air-canada-responsible-for-errors-by-chatbot-civil-resolution-tribunal-rules-8320420)
  and made the airline pay. The missing detail: what the bot said wasn't
  held to the same source as the rest of the site. Whatever your interface
  says, you said it.
- **A Chevrolet dealership, December 2023.** A user told the dealer's
  ChatGPT-powered chatbot to agree with everything and to end every reply
  with "and that's a legally binding offer". It then agreed to sell a 2024
  Tahoe for $1. No car was sold, but the
  [screenshots spread](https://venturebeat.com/ai/a-chevy-for-1-car-dealer-chatbots-show-perils-of-ai-for-customer-service)
  and the bot came down. The missing detail: limits on what a car
  dealership's assistant would talk about at all.
- **Replit, July 2025.** An AI coding agent
  [deleted a live production database](https://gizmodo.com/replits-ai-agent-wipes-companys-codebase-during-vibecoding-session-2000633176)
  during a code freeze its user had spelled out in capital letters.
  Replit's CEO called it "unacceptable and should never be possible". The
  missing detail: the agent could reach production at all. An instruction
  in a chat is not a permission.
- **Lovable, 2025.** A researcher scanned 1,645 apps built with the AI app
  builder and found about 170 that let anyone read their users' data,
  because the database's row-level security wasn't set up properly
  ([CVE-2025-48757](https://www.tenable.com/cve/CVE-2025-48757)). The apps
  worked. They also worked for strangers.

In every case the happy path was fine. The demo would have passed. What
failed was the part nobody demos: strange input, a user trying to break it,
an agent that's wrong and confident. AI made the happy path cheap, so this
part is where the work is now.

## So, does anybody care?

Honestly, about some details, no. Nobody will notice a margin of 14px
instead of 16px, and treating every pixel as sacred is how you never ship.

But details add up. One rough edge is nothing. Twenty of them and the
product "feels cheap", even if nobody can say why. Trust works like that
too: you build it in small deposits and lose it in one withdrawal, like a
double charge.

People also act on details they never consciously notice. Nobody writes in
to say a page felt a tenth of a second faster. Yet in a
[study by Deloitte for Google](https://web.dev/case-studies/milliseconds-make-millions),
making mobile sites 0.1 seconds faster went with 8.4% more conversions for
retail sites and 10.1% for travel sites.

Google once cared about one detail enough to test
[41 shades of blue](https://stopdesign.com/archive/2009/03/20/goodbye-google.html)
for its links, and a Google UK executive later said the winning blue was
worth an extra $200m a year in ad revenue. The same kind of testing is why
Doug Bowman, Google's top visual designer, quit in 2009. He was tired of
having to prove with data whether a border should be 3, 4 or 5 pixels wide.

Both sides cared about the details. They disagreed on how to decide them:
measure everything, or trust someone's judgment. That's the same question
this post is really about.

There's also a new reader who cares about your details: the AI. Coding
agents copy the patterns around them. If your codebase formats money five
different ways, the agent picks one at random. If there's one `formatNPR`
and one `SubmitButton`, it uses those. The details in your code become the
defaults for every line the AI writes next.

## Make it work, or craft the system?

My answer: craft the system, so the system makes doing it well the default.
Then do the rest by hand.

That's because there are two kinds of details:

1. **Details you can decide once.** How money and dates are formatted. The
   spacing and type scales. Every input has a label. Every submit button
   has a pending state. Payments carry an idempotency key. Agents never get
   production credentials. Decide these once, put them in the system, and
   stop thinking about them.
2. **Details that need judgment.** What the empty state says. Whether an
   animation feels right or just busy. Which failure deserves a message and
   which deserves a quiet retry. What to leave out. No component decides
   these. Someone has to look at the screen and care.

A good kitchen works the same way. Before service, everything is chopped,
measured and in its place. That's the system, and it's why the food comes
out the same on a busy Saturday as on a quiet Tuesday. But the chef still
tastes the plate before it goes out. That's the craft. A kitchen with only
the system serves consistent food nobody remembers. A chef with no system
can't get through Saturday.

### What crafting the system looks like

**One way to do each thing.** Put each decision in exactly one place:

```ts title="src/lib/money.ts"
const grouping = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
})

/** formatNPR(2500000) → "Rs 25,00,000" */
export function formatNPR(amount: number) {
  return `Rs ${grouping.format(amount)}`
}
```

**Components that carry the details**, so nobody has to remember them.
This button can't be pressed twice and always shows that something is
happening:

```jsx title="src/components/submit-button.jsx"
import { useFormStatus } from "react-dom"

export function SubmitButton({ children, pendingText }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending}>
      {pending ? pendingText : children}
    </button>
  )
}
```

`useFormStatus` reads the state of the form it sits in, so any form with an
action gets this for free. I covered how that works in
[Async React](/writing/async-react).

**Tools that check for you.** A lint rule like `eslint-plugin-jsx-a11y`
flags inputs without labels and images without alt text. A test that clicks
the pay button twice and expects one charge catches the double charge
before a customer does.

**Rules written where the AI reads them.** Put the decisions in `AGENTS.md`
or `CLAUDE.md`, the same way I suggested for
[choosing a stack](/writing/choosing-a-frontend-stack):

```md title="AGENTS.md"
## Details

- Format money with `formatNPR` from `src/lib/money.ts`. Never call
  `toLocaleString()` on amounts.
- Times use `Intl.DateTimeFormat` with `timeZone: "Asia/Kathmandu"`.
  Nepal is UTC+5:45; never add hours by hand.
- Every input has a `<label>`, the right `type` and an `autocomplete`.
- Every form submits through `SubmitButton`.
- Payment requests send an idempotency key.
- Numbers that change or sit in columns use `tabular-nums`.
- Anything that moves more than a fade respects `prefers-reduced-motion`.
- Agents never get production credentials.
```

Every session, yours or the AI's, now starts from those decisions instead
of from the average of the internet.

### What only you can do

The system won't tell you that your empty state is depressing, that the
success message is too loud, or that the flow has one step too many. For
that you have to use the thing, the way your users will. Before you ship:

- Click everything twice.
- Throttle the network to slow 4G in DevTools, then turn it off completely.
- Make it fail. What does the user see, and what can they do next?
- Try it with no data, one item, and a thousand.
- Paste a very long name, and some text in Devanagari.
- Use it with only a keyboard.
- Use it on a real, cheap phone, with the system font size turned up.
- Ask yourself: if this were my money, would I trust it?

## The short version

<div class="compare">
  <div class="dont">
    <p class="label">Stop at "it works"</p>
    <p>Ship whatever the happy path produces, and find the details one
    angry customer at a time.</p>
  </div>
  <div class="do">
    <p class="label">Craft the system, then look</p>
    <p>Decide the repeatable details once, in code your team and your AI
    both use. Spend your own attention on the ones only judgment can
    settle.</p>
  </div>
</div>

AI raised the floor. Anyone can ship something that works now, and that's
a good thing: more people can build. But the floor is the same for
everyone. The ceiling is still set by someone who cared enough to click the
button twice.

So, does anybody care about the details? People won't tell you. They'll
just stay, or leave.
