---
title: "How I built a Nepali date picker for shadcn/ui"
description: "Why Nepali apps need Bikram Sambat dates, how I built nepali-day-picker on top of react-day-picker, and how to use it with shadcn/ui: date pickers, fiscal-year ranges, holidays and forms."
date: "2026-11-27"
tags: ["react", "shadcn", "nepal", "dates"]
---

In Nepal, the date on an invoice, a payslip or a tax form is in Bikram
Sambat (BS), not the Gregorian calendar (AD). As I write this it's
27 November 2026, which on a Nepali calendar is Mangsir 11, 2083.

I build billing and inventory software for businesses in Nepal, like
[Kuver Books](https://kuverbooks.com/), so almost every screen I work on
shows a BS date. But the Calendar in [shadcn/ui](https://ui.shadcn.com),
like nearly every date picker, only knows AD.

So I built [nepali-day-picker](https://npmx.dev/package/nepali-day-picker).
After a one-import change, shadcn's Calendar lays out BS months. The same
package converts, formats and parses BS dates, works out Nepal's fiscal
year and knows the public holidays. Your app keeps storing plain
JavaScript `Date`s.

Every calendar below is shadcn's own `calendar.tsx` with that one change,
and you can edit the code next to it.

```jsx playground title="nepali-calendar.jsx" network="none"
import { useState } from "react"
import { formatBs } from "nepali-day-picker"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"

const VARIANTS = ["bs", "bs-ad", "ad-bs", "ad"]

export default function App() {
  // 11 Mangsir 2083, which is 27 November 2026
  const [date, setDate] = useState(new Date(2026, 10, 27))
  const [variant, setVariant] = useState("bs-ad")
  const [lang, setLang] = useState("ne")

  return (
    <>
      <p className="flex flex-wrap gap-2">
        {VARIANTS.map((name) => (
          <Button
            key={name}
            size="sm"
            variant={variant === name ? "default" : "outline"}
            aria-pressed={variant === name}
            onClick={() => setVariant(name)}
          >
            {name}
          </Button>
        ))}
      </p>
      <label>
        <input
          type="checkbox"
          checked={lang === "en"}
          onChange={(event) => setLang(event.target.checked ? "en" : "ne")}
        />
        English
      </label>
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        defaultMonth={date}
        variant={variant}
        lang={lang}
        className="rounded-lg border [--cell-size:--spacing(9)]"
      />
      <p>{date ? formatBs(date, "full", { lang }) : "No day selected"}</p>
    </>
  )
}
```

## The short version

- **BS month lengths can't be calculated.** A month has 29 to 32 days, and
  Nepal's calendar committee publishes them year by year, so every
  converter is a table plus some arithmetic.
- **nepali-day-picker plugs into react-day-picker**, the library under
  shadcn's Calendar, and answers its date questions in BS. Selection,
  ranges, keyboard navigation and accessibility stay react-day-picker's.
- **Values stay plain `Date`s.** BS is only how dates are shown and typed,
  so forms, validators and your database don't change.
- **The data is honest.** I compared five open-source tables year by year.
  Years the committee hasn't published yet (BS 2084 on) throw an error
  instead of returning a guess.
- **Fiscal years, public holidays and your own events are built in.** The
  core is about 5.9 kB minified and brotli-compressed, with no
  dependencies.

## The problem it solves

**Every date a Nepali user reads is BS.** Invoices, payslips, school
notices and government forms all use it. Nepal's fiscal year runs from
Shrawan 1, in mid-July, to the end of Asar, and businesses report by fiscal
year, by trimester (चौमासिक) or by quarter (त्रैमासिक).

**JavaScript only knows AD.** `Date`, `Intl` and `<input type="date">`
have no Bikram Sambat. shadcn's Calendar is
[react-day-picker](https://daypicker.dev), which does its date maths with
date-fns, which is Gregorian too.

**You can't compute a BS month.** Here are two real years:

```text
Month     1   2   3   4   5   6   7   8   9  10  11  12   Total
2081 BS  31  32  31  32  31  30  30  30  29  30  29  31     366
2082 BS  31  31  32  31  31  31  30  29  30  29  30  30     365
```

Jestha, the second month, had 32 days in 2081 and 31 in 2082. Nothing in
2081 tells you that. The month lengths come from the committee's published
calendar, so a converter is only as good as its table, and the tables in
circulation disagree, mostly about future years.

**Time zones move dates.** Nepal is UTC+5:45. A date picked at local
midnight and sent with `toISOString()` becomes the previous day in UTC, and
a server running in UTC thinks it's still yesterday for the first 5¾ hours
of every Nepali day.

The common way out is a separate Nepali date picker with its own look next
to shadcn's, and often a library with its own `NepaliDate` class that has
to be turned back into a `Date` for every form library, validator and API. I
wanted the Calendar we already had, in BS, with plain `Date`s in and out.

## Where it's useful

- **Billing and point of sale:** invoice dates in BS, with the AD date
  underneath for customers who think in AD (`variant="bs-ad"`).
- **Reports:** sales or VAT figures by fiscal year, quarter or trimester,
  with `getFiscalPeriodRange` giving the first and last day.
- **HR and payroll:** dates of birth and joining dates in BS, and leave
  calendars where Saturdays and public holidays are already red.
- **Forms people fill in:** `parseBs` reads `२०५५-०२-०५`, `05/02/2055` or
  `5 Jestha 2055`, in Nepali or English digits.
- **Schools:** a school year that starts on Baisakh 1 is
  `{ startMonth: 1 }` on any fiscal helper.
- **Team calendars:** your own holidays and events, in bulk, from JSON.

## How I built it

### Start with the data

I extracted the month tables of five open-source packages and compared them
year by year. For each year, the table keeps the row most sources agree on,
and marks how much to trust it:

| Years | Status |
|---|---|
| 2000–2083 BS | All five sources agree on every month |
| 1975, 1977, 1981, 1991, 1998 | Disputed: sources split the days between months differently, though year totals agree |
| 1970–1974 | Only one source |
| 2084–2100 | Projected: not published yet |

For the projected years the sources fall into two camps. I kept the
majority row. It's also the only choice whose New Year dates match an
estimate of Mesh Sankranti, the moment the sun enters sidereal Aries, in
every year where that moment isn't close to midnight.

Then I checked BS 2083 month by month against the government's own list of
public holidays for that year[^gazette], which gives every holiday in both
BS and AD. All 32 dated entries match the table.

A month length is always 29 plus 0 to 3, so it fits in two bits, and a
whole year fits in one number:

```ts title="table.ts"
// One number per BS year from 1970: month m (0–11) has 29 + 2 bits of days.
const monthLength = (year, month) =>
  29 + ((ENCODED_MONTHS[year - FIRST_YEAR] >> (2 * (month - 1))) & 3)
```
{>> the whole table, 1970 to 2100, is 131 numbers <<}

### Refuse dates nobody knows yet

BS 2084 starts in April 2027, and the committee hasn't published it yet. A
projection can be a day off, and a confident wrong date on an invoice is
worse than an error. So by default, any date from BS 2084 on throws a
`ProjectedDateError`:

```ts
import { adToBs, allowProjectedDates, ProjectedDateError } from "nepali-day-picker"

try {
  adToBs(new Date(2027, 4, 1))
} catch (error) {
  if (error instanceof ProjectedDateError) {
    // "AD 2027-05-01 falls in BS 2084, whose month lengths are not published yet. …"
    console.log(error.year) // 2084
  }
}

// If an estimate that can be a day off is fine, opt in once at startup:
allowProjectedDates()
```

This one bites billing apps right now. The fiscal year we're in, FY
2083/84, ends in Asar 2084, so `getFiscalPeriodRange(2083)` throws today.
Quarters that end by Chaitra 2083 still work. When the committee publishes
2084, a patch release moves it into the confirmed range.

### Count days, not milliseconds

A `Date` stands for its **local calendar day**, and the time is ignored.
The converter reads the day's local year, month and day, turns them into a
day number with integer maths[^hinnant], and walks the table. There's no
millisecond arithmetic, so daylight saving and UTC offsets can't push a
date into the next or previous day.

The test suite runs in seven time zones, including Asia/Kathmandu, two
with daylight saving time, and two Pacific zones that once skipped a whole
calendar day.

### Keep plain `Date`s

Every function takes and returns ordinary `Date`s or text. React Hook Form,
Zod, date-fns and your database keep working with what they already store.
Moving a screen from AD to BS changes how dates are shown and typed, not
your data model.

### Teach react-day-picker a new calendar

This is the part that makes the shadcn integration a one-line change.
react-day-picker doesn't do date maths itself. It asks a date library
"where does this month start?", "what's one month later?" and "how do I
print this caption?", through a `DateLib` object built on date-fns. Its
`dateLib` prop lets you replace any of those functions.

So `createBsDateLib` answers them in BS. Days and weeks are the same in
both calendars, so only the month and year questions change: 19
functions, such as `startOfMonth`, `addMonths`, `getMonth`,
`eachMonthOfInterval` and `format`.

```ts title="date-lib.ts (simplified)"
// toBs and fromBs convert a Date to BS and back. fromBs also rolls
// month 13 into the next year and clamps the day to the month's length.
export function createBsDateLib({ lang = "ne" } = {}) {
  return {
    startOfMonth: (date) => {
      const { year, month } = toBs(date)
      return fromBs(year, month, 1)
    },
    addMonths: (date, amount) => {
      const { year, month, day } = toBs(date)
      // 32 Jestha + 1 month = the last day of Asar
      return fromBs(year, month + amount, day)
    },
    getMonth: (date) => toBs(date).month - 1,
    getYear: (date) => toBs(date).year,
    // "LLLL y" becomes "MMMM YYYY": मंसिर २०८३
    format: (date, pattern) => formatBs(date, translate(pattern), { lang }),
    // …and 14 more
  }
}
```

The `DayPicker` in `nepali-day-picker/react` wraps react-day-picker's with
that date library and a few defaults:

- weeks start on Sunday (आइतबार)
- navigation stays inside the confirmed data
- captions, weekday names and screen-reader labels are in Nepali or English
- Saturdays and holidays are red
- in the two-calendar variants, the other calendar's day number sits under
  each day

It also re-exports everything else from react-day-picker. shadcn's
`calendar.tsx` is react-day-picker with Tailwind classes, so swapping its
import is enough, and nothing else in the file breaks.

### Take holidays from the government's list

The public holidays come from the Ministry of Home Affairs' list for BS
2083[^gazette]. I kept only the 20 **nationwide** entries and left out the
ones for one region or community, like Gai Jatra or Terai Holi. Eid is left
out until its date is announced, because it depends on the moon. The list
is a separate entry point, `nepali-day-picker/holidays`, so the core never
downloads it.
{>> Saturday is the weekly day off in Nepal, so it's red too <<}

### Test every day, and keep it small

- A round trip, BS to AD and back, of all ~47,800 days in the table.
- New Year's Day from 2070 to 2083, and national dates such as
  Constitution Day: 3 Asoj 2072 is 20 September 2015.
- The calendar on react-day-picker 9.7, 9.14 and 10, and against a copy of
  shadcn's `calendar.tsx`, both untouched and with the import swapped.
- A size budget in CI: 6 kB for the whole core, 2 kB for just `adToBs` and
  `bsToAd`, and a check that the core never loads React or the holiday
  data.

## What to know before you use it

- **A `Date` is a local calendar day.** `bsToAd` returns local midnight.
- **BS months are 1 to 12** (Baisakh is 1), unlike `Date`'s 0 to 11.
- **The confirmed range is BS 1970 to Chaitra 2083** (AD 1913 to
  13 April 2027). Past it, functions throw, and the calendar stops at
  Chaitra 2083, unless you call `allowProjectedDates()`.
- **Text defaults to Nepali.** Pass `lang: "en"` for English names and
  digits, or `digits: "en"` for Nepali names with English digits.
- **Send dates as text, not as `Date`s.** Use `formatAd(date, "iso")` or
  `formatBs(date, "iso")`, so a time zone can't move the day.
- **"Today" on a server isn't today in Nepal.** A server in UTC is up to
  5¾ hours behind.
- **The holiday list covers BS 2083 for now.** `getPublicHolidays` throws
  for a year without data, so "no data" never looks like "no holiday".

## Examples with shadcn/ui

### Set it up

Add shadcn's Calendar (and Popover, for the date picker), then the
package:

```bash
npx shadcn@latest add calendar popover
npm install nepali-day-picker
```

In `components/ui/calendar.tsx`, change one import and delete shadcn's
default `formatMonthDropdown`, which prints AD month names:

```diff title="components/ui/calendar.tsx"
 import {
   DayPicker,
   getDefaultClassNames,
   type DayButton,
   type Locale,
-} from "react-day-picker"
+} from "nepali-day-picker/react"
 …
       formatters={{
-        formatMonthDropdown: (date) =>
-          date.toLocaleString(locale?.code, { month: "short" }),
         ...formatters,
       }}
```

Your `<Calendar />` now takes `variant`, `lang`, `events` and the other
Nepali props, with TypeScript types. If you'd rather not edit the file,
spread `useNepaliCalendar` into the stock Calendar instead. Pass shadcn's
day button so the two-calendar variants use it:

```tsx title="nepali-calendar.tsx"
import { useState } from "react"
import { useNepaliCalendar } from "nepali-day-picker/react"
import { Calendar, CalendarDayButton } from "@/components/ui/calendar"

export function NepaliCalendar() {
  const [date, setDate] = useState<Date>()
  const nepali = useNepaliCalendar({
    variant: "bs-ad",
    lang: "ne",
    DayButton: CalendarDayButton,
  })
  return <Calendar mode="single" selected={date} onSelect={setDate} {...nepali} />
}
```

### A date picker

shadcn's date-picker pattern works unchanged: a Popover, a Button and the
Calendar. Only the button's text changes, to `formatBs`. The month and year
dropdowns are in BS.

```jsx playground title="date-picker.jsx" network="none"
import { useState } from "react"
import { formatAd, formatBs } from "nepali-day-picker"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export default function App() {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState()

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-52 justify-start font-normal">
            {date ? formatBs(date, "long") : "मिति छान्नुहोस्"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            defaultMonth={date}
            captionLayout="dropdown"
            onSelect={(next) => {
              setDate(next)
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
      <p>
        Send to the server:{" "}
        {date ? `"${formatAd(date, "iso")}"` : "nothing yet"}
      </p>
    </>
  )
}
```

"मिति छान्नुहोस्" means "pick a date".

### A field people can type in

Most people know their date of birth in BS and would rather type it.
`parseBs` takes a list of patterns and tries them in order. It accepts
Nepali or English digits and common month spellings, and returns `null`
instead of throwing, which suits form validation. Try `5 Jestha 2055`,
`०५/०२/२०५५`, or `30/08/2083`, which isn't a date because Mangsir 2083
has only 29 days.

```jsx playground title="date-of-birth.jsx" network="none"
import { useState } from "react"
import { formatBs, parseBs } from "nepali-day-picker"
import { Calendar } from "@/components/ui/calendar"

// Tried in order. Digits can be Nepali or English.
const PATTERNS = ["YYYY-MM-DD", "DD/MM/YYYY", "D MMMM YYYY"]

export default function App() {
  const [text, setText] = useState("२०५५-०२-०५")
  const [month, setMonth] = useState(() => parseBs(text, PATTERNS))
  const date = parseBs(text, PATTERNS) // a Date, or null

  function type(next) {
    setText(next)
    const parsed = parseBs(next, PATTERNS)
    if (parsed) setMonth(parsed)
  }

  return (
    <>
      <label>
        Date of birth (BS)
        <input value={text} onChange={(event) => type(event.target.value)} />
      </label>
      <p>{date ? formatBs(date, "full", { lang: "en" }) : "Not a BS date"}</p>
      <Calendar
        mode="single"
        selected={date ?? undefined}
        onSelect={(next) => next && setText(formatBs(next, "iso"))}
        month={month}
        onMonthChange={setMonth}
        captionLayout="dropdown"
        lang="en"
        className="rounded-lg border"
      />
    </>
  )
}
```

### A fiscal-year report

Reports in Nepal go by fiscal year and its quarters, so a report filter is
a range calendar plus `getFiscalPeriodRange`. This one uses FY 2082/83,
the last complete one: FY 2083/84 ends in the unpublished 2084, so it
would throw.

```jsx playground title="fiscal-report.jsx" network="none"
import { useState } from "react"
import { formatBs, formatFiscalYear, getFiscalPeriodRange } from "nepali-day-picker"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"

const FISCAL_YEAR = 2082 // FY 2082/83: Shrawan 2082 to Asar 2083
const PERIODS = [
  { label: "Q1", period: "quarter", index: 1 },
  { label: "Q2", period: "quarter", index: 2 },
  { label: "Q3", period: "quarter", index: 3 },
  { label: "Q4", period: "quarter", index: 4 },
  { label: "Whole year", period: "year", index: 1 },
]

function rangeOf({ period, index }) {
  const { start, end } = getFiscalPeriodRange(FISCAL_YEAR, period, index)
  return { from: start, to: end }
}

const show = (date) => (date ? formatBs(date, "D MMMM YYYY", { lang: "en" }) : "…")

export default function App() {
  const [picked, setPicked] = useState("Q2")
  const [range, setRange] = useState(() => rangeOf(PERIODS[1]))
  const [month, setMonth] = useState(range.from)

  function choose(item) {
    const next = rangeOf(item)
    setPicked(item.label)
    setRange(next)
    setMonth(next.from)
  }

  return (
    <>
      <p className="flex flex-wrap gap-2">
        {PERIODS.map((item) => (
          <Button
            key={item.label}
            size="sm"
            variant={picked === item.label ? "default" : "outline"}
            aria-pressed={picked === item.label}
            onClick={() => choose(item)}
          >
            {item.label}
          </Button>
        ))}
      </p>
      <Calendar
        mode="range"
        selected={range}
        onSelect={(next) => {
          setRange(next)
          setPicked(null)
        }}
        month={month}
        onMonthChange={setMonth}
        numberOfMonths={2}
        lang="en"
        className="rounded-lg border"
      />
      <p>
        {formatFiscalYear(FISCAL_YEAR, { prefix: true, lang: "en" })}:{" "}
        {show(range?.from)} to {show(range?.to)}
      </p>
    </>
  )
}
```

### Holidays and your own events

Nepal's public holidays and Saturdays are red with no setup. Add your own
with the `events` prop, in the same JSON format as the built-in list: a
plain event shows as a dot, `"type": "holiday"` turns the day red, and
`"repeat": "yearly"` repeats on the same BS date, so a BS birthday stays
on its BS date. Kartik 2083 below has the end of Dashain, Tihar and
Chhath, plus three events of mine.

```jsx playground title="team-calendar.jsx" network="none"
import { useState } from "react"
import { bsToAd, formatBs } from "nepali-day-picker"
import { NEPAL_HOLIDAYS, createEventLookup, getEventName } from "nepali-day-picker/holidays"
import { Calendar } from "@/components/ui/calendar"

// Your own holidays and events. Keep the array stable:
// a constant, state or useMemo.
const EVENTS = [
  { date: "2083-07-15", name: "Payroll" },
  { date: "2083-07-18", endDate: "2083-07-19", name: "Stocktake", type: "holiday" },
  { date: "2055-07-10", name: "Sita's birthday", repeat: "yearly", color: "#2563eb" },
]

// Index everything once, to list what's on the selected day.
const eventsOn = createEventLookup([...NEPAL_HOLIDAYS, ...EVENTS])

export default function App() {
  const [date, setDate] = useState(() => bsToAd(2083, 7, 24))
  const onThatDay = date ? eventsOn(date) : []

  return (
    <>
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        defaultMonth={date}
        events={EVENTS}
        variant="bs-ad"
        lang="en"
        className="rounded-lg border [--cell-size:--spacing(9)]"
      />
      <p>{date ? formatBs(date, "full", { lang: "en" }) : "Pick a day"}</p>
      <ul>
        {onThatDay.map((event) => (
          <li key={getEventName(event, "en")}>{getEventName(event, "en")}</li>
        ))}
      </ul>
      {date && onThatDay.length === 0 && <p>Nothing on this day.</p>}
    </>
  )
}
```

Events from an API or a file go through `parseEvents(json)` first. It
checks every entry and throws a `TypeError` that names the bad one, such
as `events[3].date`.

### In a form

The selected value is a `Date`, so React Hook Form and Zod need nothing
special. Send it to the server as text:

```tsx title="person-form.tsx"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { formatAd } from "nepali-day-picker"
import { Calendar } from "@/components/ui/calendar"

const schema = z.object({ dateOfBirth: z.date() })

export function PersonForm() {
  const form = useForm({ resolver: zodResolver(schema) })

  const save = form.handleSubmit(({ dateOfBirth }) =>
    fetch("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // "1998-05-19", not a Date, so no time zone can move the day
      body: JSON.stringify({ dateOfBirth: formatAd(dateOfBirth, "iso") }),
    })
  )

  return (
    <form onSubmit={save}>
      <Controller
        control={form.control}
        name="dateOfBirth"
        render={({ field }) => (
          <Calendar
            mode="single"
            selected={field.value}
            onSelect={field.onChange}
            captionLayout="dropdown"
          />
        )}
      />
      <button type="submit">Save</button>
    </form>
  )
}
```

### On the server

`nepali-day-picker/react` starts with `"use client"`, but the core isn't a
client module. `formatBs`, `adToBs` and the fiscal helpers also run in
Server Components, so an invoice can render its BS date on the server:

```tsx title="invoice-header.tsx"
import { formatBs, formatFiscalYear, getFiscalYear } from "nepali-day-picker"

export function InvoiceHeader({ invoice }: { invoice: { issuedOn: Date } }) {
  const fiscalYear = getFiscalYear(invoice.issuedOn)
  // "मिति: ११ मंसिर २०८३ · आ.व. २०८३/८४"
  return (
    <p>
      मिति: {formatBs(invoice.issuedOn, "long")} ·{" "}
      {formatFiscalYear(fiscalYear, { prefix: true })}
    </p>
  )
}
```

Not using React? `getBsMonthGrid(year, month)` gives a BS month as plain
data (weeks of days, each with its `Date`, BS and AD dates, and today,
Saturday and holiday flags) to render in Vue, Svelte or plain DOM.

## When not to use it

- **Dates before BS 1970 or after BS 2100.** They're outside the table.
- **Exact dates after Chaitra 2083, today.** They're projections until the
  committee publishes them.
- **Tithi, festivals, or holidays of one region or group.** Only
  nationwide public holidays are built in. Add others with `events`.
- **Nepal Sambat or other calendars.** It only does BS and AD.
- **Times of day.** It works with calendar days. Use `Date`, `Intl` or a
  time library for hours and minutes.

## Try it

```bash
npm install nepali-day-picker
```

The code, the data sources and the full calendar guide are on
[GitHub](https://github.com/sandeshthapa07/nepali-day-picker), and the
package is on [npm](https://npmx.dev/package/nepali-day-picker). If a date
is wrong, please
[open an issue](https://github.com/sandeshthapa07/nepali-day-picker/issues)
with the correct date and its source, like a photo of a printed calendar.
Date data matters more than anything else in it.

[^gazette]: The Ministry of Home Affairs' "List of Public Holidays, 2083",
  published on 2 March 2026, as summarised by
  [Pradhan & Associates](https://pradhanlaw.com/publications/list-of-public-holidays-2083-202627),
  who link the Nepal Gazette copy.

[^hinnant]: Howard Hinnant's
  [`days_from_civil`](https://howardhinnant.github.io/date_algorithms.html#days_from_civil):
  a few lines of integer maths that turn a year, month and day into a day
  count, with no `Date` objects.
