---
title: "Bikram Sambat in React: building a Nepali date converter"
description: "Why Nepali (Bikram Sambat) dates are hard in JavaScript, the bugs they cause in React apps, and how I built a BS to AD converter that is honest about its data."
date: "2026-11-19"
tags: ["react", "javascript", "nepal", "dates"]
---

In Nepal, the date on an invoice, a payslip or a government form is in
Bikram Sambat (BS), not the Gregorian calendar (AD) most of the world uses.
As I write this, it's 19 November 2026 in AD and Mangsir 3, 2083 in BS.

I build billing and inventory software for businesses in Nepal, like
[Kuver Books](https://kuverbooks.com/), so almost every screen I work on
shows a BS date. JavaScript doesn't know this calendar at all. Apps I've
worked on used two of the popular converters, and this year I compared
their data, found problems, and wrote my own.

This post covers what makes BS dates hard, what the data comparison showed,
how my converter works, and how to use BS dates in React without the usual
bugs.

**Looking for a package to install?** The converter in this post,
`bikramsambat`, is the one I wrote first, and it isn't on npm. I've since
published [nepali-day-picker](/writing/nepali-date-picker-shadcn-ui), a
separate library for the same problems. It keeps your dates as plain
`Date`s, builds its data from five tables instead of three, and turns
shadcn/ui's Calendar into a BS calendar.

## The short version

- **BS month lengths can't be calculated.** They're published year by year,
  so every converter is a table of month lengths plus some arithmetic.
- **The public tables don't agree.** Two of them match on every year from
  2000 to 2083 BS. From 2084 BS, which starts in April 2027, they give
  different dates.
- **"Today" has to be worked out in Nepal time** (UTC+5:45), not on
  whatever machine runs the code.
- **`Date`, `Intl` and `<input type="date">` only know the Gregorian
  calendar.**
- **Store one plain value and convert at the edges.** And never let a BS
  string and an AD string mix.

## What makes Bikram Sambat different

- The BS year is 56 or 57 years ahead of AD. From mid-April to December, add
  57 to the AD year. From January to mid-April, add 56.
- The new year, Baishakh 1, falls on 13 or 14 April.
- There are 12 months: Baishakh, Jestha, Ashadh, Shrawan, Bhadra, Ashwin,
  Kartik, Mangsir, Poush, Magh, Falgun and Chaitra.
- A month has 29 to 32 days, and the same month changes length from one
  year to the next.
- Nepal's fiscal year runs from Shrawan 1, in mid-July, to the end of
  Ashadh.

Here are two real years side by side:

```text
Month     1   2   3   4   5   6   7   8   9  10  11  12   Total
2081 BS  31  32  31  32  31  30  30  30  29  30  29  31     366
2082 BS  31  31  32  31  31  31  30  29  30  29  30  30     365
```

Jestha had 32 days in 2081 and 31 in 2082. Nothing in 2081 tells you that.

## Problem 1: you can't calculate the month lengths

A BS month is as long as the sun takes to cross one sign of the zodiac,
measured against the stars. The Nepal Panchanga Nirnayak Samiti, the
national calendar committee, works the lengths out and publishes them as a
calendar, year by year.

So there's no formula to code. Every BS converter is the same two things: a
table with twelve month lengths for each year, and arithmetic that counts
days through it. The arithmetic is easy. **The table is the library.**

## Problem 2: the tables don't agree

Each library ships its own copy of that table, typed in from printed
calendars at some point. In September I compared three that are maintained
in the open:

| Table | Years |
|---|---|
| [opensource-nepal/node-nepali-datetime](https://github.com/opensource-nepal/node-nepali-datetime) | 2000–2099 BS |
| [sbmdkl/nepali-date-converter](https://github.com/sbmdkl/nepali-date-converter) | 1978–2099 BS |
| [nepalicalendar/nepalicalendar-py](https://github.com/nepalicalendar/nepalicalendar-py) | 2000–2090 BS |

What I found, as of November 2026:

- **From 2000 to 2083 BS, the first two agree on every year.** That's 84
  years, row for row.
- **The third differs in 2062, 2081, 2082 and 2083.** Its yearly totals
  still match, so New Year lands on the right day, but dates inside the year
  move. For 19 November 2026 it says Mangsir 4. The other two, and the
  calendar sites I checked, say Mangsir 3. A test that only checks New
  Year's Day would pass.
- **From 2084 BS on, the first table disagrees with the other two, every
  year.** The other two match each other, but not because they're right.

They match because they share the same filler. Both end every row from
2084 to 2090 with `30, 30, 30`, with Poush at 29 days, and no real year
between 2000 and 2083 ends like that. Two tables agreeing proves nothing
when they share the same guess. The first table guesses differently: it
repeats the calendar from 19 years earlier, and five of its seven rows for
2084 to 2090 are copies of 2065 to 2071. That's a more sensible guess, but
it's still a guess.

And 2084 isn't far away. It starts on 14 April 2027, and the dates already
disagree:

| Date | One table says | Two tables say |
|---|---|---|
| Ashadh 1, 2084 | 16 June 2027 | 15 June 2027 |
| Jestha 32, 2084 | A real date | Doesn't exist |
| Baishakh 1, 2085 (New Year) | 14 April 2028 | 13 April 2028 |

If you build billing software, note that the fiscal year we're in now,
2083/84, ends in Ashadh 2084. Until the official 2084 calendar is out and
the libraries copy it, every date after April 2027 is a guess.

## Problem 3: "today" depends on where your code runs

Nepal is UTC+5:45 and has no daylight saving time. A server running in UTC
is 5 hours 45 minutes behind, so for the first 5¾ hours of every Nepali
day it still thinks it's yesterday. A converter that builds "today" from
the machine's clock gets the BS date wrong for those hours.

At 00:05 on 13 April 2024 in Kathmandu, Nepal had just started the year
2081. On a UTC server it was 18:20 on 12 April, so the server said Chaitra
30, 2080.

Parsing makes it worse. `new Date("2026-04-14")` means midnight UTC, so in
New York `getDate()` returns 13, and any BS date you work out from it is a
day early.

Nepal has also changed its offset before. It was UTC+5:30 until 1 January
1986, and converters that go back to 1943 run into that too.

The fix is to get the date in Nepal first, and only then convert it:

```ts
const nepalDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kathmandu",
})

// "2024-04-13", whatever timezone the machine is in
nepalDate.format(new Date(Date.UTC(2024, 3, 12, 18, 20)))
```

The `en-CA` locale formats dates as `YYYY-MM-DD`, and the browser's
timezone data already knows about 1986. In my converter I do the same with
plain arithmetic, so it has no dependencies at all.

## Problem 4: JavaScript doesn't know Bikram Sambat

- **`Intl` has no BS calendar.** `Intl.supportedValuesOf("calendar")` lists
  the calendars your runtime supports, and Bikram Sambat isn't one of them.
  The `indian` calendar in that list is the Indian national calendar
  (Saka), which is a different calendar.
- **Nepali formatting can fool you.**
  `new Intl.DateTimeFormat("ne-NP", { dateStyle: "full" })` gives
  "२०२६ नोभेम्बर १९, बिहिबार". That's Nepali script, but it's still the
  Gregorian date.
- **`<input type="date">` only picks Gregorian dates.**

`Intl` is still useful for numbers.
`new Intl.NumberFormat("ne-NP").format(123456)` gives "१,२३,४५६": Nepali
digits, grouped in lakhs the way people in Nepal write them.

## How I built the converter

Those problems shaped the converter I wrote, `bikramsambat`. It's small:
one data file, about 180 lines of conversion code and a date class on top.

### One number for every date

Every date becomes a **day number**: the count of days since Baishakh 1,
2000 BS, which was 14 April 1943. BS to AD and AD to BS both go through it.

```ts title="convert.ts"
// Days from Baishakh 1, 2000 BS to Baishakh 1 of each year in the table.
const YEAR_START = [0]
for (const months of MONTH_DAYS) {
  YEAR_START.push(YEAR_START.at(-1) + months.reduce((a, b) => a + b))
}

function toDayNumber(year, month, day) {
  const row = MONTH_DAYS[year - 2000]
  let days = YEAR_START[year - 2000]
  for (let m = 0; m < month - 1; m++) days += row[m]
  return days + day - 1
}

function fromDayNumber(dayNumber) {
  // Binary search for the year, then walk at most 12 months.
  let lo = 0
  let hi = MONTH_DAYS.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (YEAR_START[mid] <= dayNumber) lo = mid
    else hi = mid - 1
  }
  let rest = dayNumber - YEAR_START[lo]
  let month = 0
  while (rest >= MONTH_DAYS[lo][month]) rest -= MONTH_DAYS[lo][month++]
  return { year: 2000 + lo, month: month + 1, day: rest + 1 }
}
```

The AD side only uses `Date.UTC` and whole days, so no timezone can move a
date. The weekday comes free too: Baishakh 1, 2000 BS was a Wednesday, so
the weekday is `(3 + dayNumber) % 7`.

### Be honest about the range

After the comparison, I shipped the years two tables agree on as verified,
labelled the guesses, and refused the rest:

| Years | What happens |
|---|---|
| 2000–2083 BS | Verified: two independent tables agree |
| 2084–2090 BS | Works, but `isProvisional` is `true` |
| Anything else | Throws `DateOutOfRangeError` |

A confident wrong date is worse than an error. An app that shows due dates
can check `isProvisional` and say the date may change.

### Fail loudly

Baishakh 2081 has 31 days, so `new NepaliDate(2081, 1, 32)` throws
`InvalidNepaliDateError`. It would be easy to roll it over into Jestha 1,
but then a typo turns into a wrong date nobody notices. The same goes for
AD input: `Date.UTC(2024, 1, 30)` quietly becomes 1 March, so the converter
checks the result and throws instead.

### Make dates easy to compare

Dates are immutable, and `valueOf()` returns the day number, so `a < b`
and `dates.sort((a, b) => a - b)` just work.

### Test every day

The tests pin New Year's Day for ten years to the published calendars and
check that every year has 365 or 366 days and every month 29 to 32. Then
they walk all of the roughly 33,000 days in the table. For each day, BS to
AD and back must give the same date, the AD dates must move forward by
exactly one day, and the BS weekday must match the AD weekday.

New Year checks alone aren't enough. The third table above gets New Year
2082 and 2083 right and is still a day off today.

### Try it

Here's the same idea, cut down to two real years of the table, 2082 and
2083 BS, so it fits on screen. Change the AD date, or pick a BS date. Then
type 30 as the day: Mangsir 2083 has only 29 days, so you get an error
instead of a date in Poush. Switch to Ashadh and 32 works. Edit the code and
the preview updates.

```jsx playground title="bs-converter.jsx" network="none"
import { useState } from "react"

// Two real rows of the table: month lengths for 2082 and 2083 BS,
// Baishakh first. A full converter has one row per year.
const FIRST_YEAR = 2082
const MONTH_DAYS = [
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2082
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2083
]
// Baishakh 1, 2082 BS was 14 April 2025.
const FIRST_DAY = Date.UTC(2025, 3, 14)
const DAY = 24 * 60 * 60 * 1000

const MONTHS = [
  "Baishakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
]

const daysIn = (year, month) => MONTH_DAYS[year - FIRST_YEAR][month - 1]

// BS to a day number: days since the first day in the table.
function toDayNumber(year, month, day) {
  let days = 0
  for (let y = FIRST_YEAR; y < year; y++) {
    for (let m = 1; m <= 12; m++) days += daysIn(y, m)
  }
  for (let m = 1; m < month; m++) days += daysIn(year, m)
  return days + day - 1
}

// A day number back to BS, or null past the end of the table.
function fromDayNumber(days) {
  for (let year = FIRST_YEAR; year < FIRST_YEAR + MONTH_DAYS.length; year++) {
    for (let month = 1; month <= 12; month++) {
      if (days < daysIn(year, month)) return { year, month, day: days + 1 }
      days -= daysIn(year, month)
    }
  }
  return null
}

function adToBs(iso) {
  const [y, m, d] = iso.split("-").map(Number)
  const days = (Date.UTC(y, m - 1, d) - FIRST_DAY) / DAY
  return days >= 0 ? fromDayNumber(days) : null
}

function bsToAd(year, month, day) {
  const time = FIRST_DAY + toDayNumber(year, month, day) * DAY
  return new Date(time).toISOString().slice(0, 10)
}

export default function App() {
  const [ad, setAd] = useState("2026-11-19")
  const [year, setYear] = useState(2083)
  const [month, setMonth] = useState(8)
  const [day, setDay] = useState("3")

  const bs = ad ? adToBs(ad) : null
  const max = daysIn(year, month)
  const dayNumber = Number(day)
  const valid = Number.isInteger(dayNumber) && dayNumber >= 1 && dayNumber <= max

  // Months run 29 to 32 days, so a new month can make the day too big.
  function pick(nextYear, nextMonth) {
    setYear(nextYear)
    setMonth(nextMonth)
    const nextMax = daysIn(nextYear, nextMonth)
    if (Number(day) > nextMax) setDay(String(nextMax))
  }

  return (
    <>
      <label>
        AD date
        <input
          type="date"
          min="2025-04-14"
          max="2027-04-13"
          value={ad}
          onChange={(e) => setAd(e.target.value)}
        />
      </label>
      <p>
        {bs
          ? `${MONTHS[bs.month - 1]} ${bs.day}, ${bs.year} BS`
          : "Pick a date from 14 April 2025 to 13 April 2027"}
      </p>

      <fieldset>
        <legend>BS date</legend>
        <select
          aria-label="Year"
          value={year}
          onChange={(e) => pick(Number(e.target.value), month)}
        >
          <option value={2082}>2082</option>
          <option value={2083}>2083</option>
        </select>
        <select
          aria-label="Month"
          value={month}
          onChange={(e) => pick(year, Number(e.target.value))}
        >
          {MONTHS.map((name, i) => (
            <option key={name} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
        <input
          aria-label="Day"
          type="number"
          min={1}
          max={max}
          value={day}
          onChange={(e) => setDay(e.target.value)}
        />
      </fieldset>
      <p>
        {valid
          ? `${bsToAd(year, month, dayNumber)} AD`
          : `Not a date: ${MONTHS[month - 1]} ${year} has ${max} days`}
      </p>
    </>
  )
}
```

A full converter is the same code with one row per year.

## Using BS dates in React

### Show today without a hydration error

If you render "today" on the server, you get two bugs. The server's today
may be yesterday in Nepal (problem 3), and a prerendered page keeps the
date from the day it was built. Either way, the HTML doesn't match what the
browser renders, and React reports a hydration error.

So don't render the date on the server. Read it in the browser.
`useSyncExternalStore` does this cleanly: `getServerSnapshot` returns
`null`, and the browser snapshot is a plain string, so React only re-renders
when the date actually changes.

```ts title="use-today-in-nepal.ts"
import { useSyncExternalStore } from "react"

const nepalDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kathmandu",
})

// Check every minute, and when the tab comes back after sleeping.
function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 60_000)
  document.addEventListener("visibilitychange", onChange)
  return () => {
    clearInterval(id)
    document.removeEventListener("visibilitychange", onChange)
  }
}

/** Today's date in Nepal as "YYYY-MM-DD", or null on the server. */
export function useTodayInNepal() {
  return useSyncExternalStore(
    subscribe,
    () => nepalDate.format(new Date()),
    () => null
  )
}
```

Return a string, not a date object. `getSnapshot` has to return the same
value until something changes, and a new object on every call makes React
re-render forever. The Nepal time on [this site's home page](/) works the
same way.

Then convert where you show it, and keep the AD date in `dateTime` for
machines:

```tsx
function Today() {
  const today = useTodayInNepal()
  if (!today) return null
  const [year, month, day] = today.split("-").map(Number)
  const bs = adToBs(year, month, day)
  return <time dateTime={today}>{formatNepali(bs)}</time>
}
```

### Take a BS date as input

`<input type="date">` can't do it. Three fields work well: a year, a month
select, and a day whose maximum follows the month, like the playground
above. Two details matter. When the month changes, bring the day down to
the new month's length. And keep the day as text while the user types, so
clearing the field doesn't turn into day 0.

### Format it in Nepali

```ts
const MONTHS_NE = [
  "बैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज",
  "कात्तिक", "मंसिर", "पुस", "माघ", "फागुन", "चैत",
]
const digits = new Intl.NumberFormat("ne-NP", { useGrouping: false })

function formatNepali({ year, month, day }) {
  return `${MONTHS_NE[month - 1]} ${digits.format(day)}, ${digits.format(year)}`
}

formatNepali({ year: 2083, month: 8, day: 3 }) // "मंसिर ३, २०८३"
```

Month spellings vary between printed calendars. Pick one set and use it
everywhere.

### Store one value, and label it

Pick one canonical value and convert at the edges. I store the AD date as
`YYYY-MM-DD` (or the day number) and convert to BS only to show it or to
read it from a form. A JavaScript `Date` with a time attached brings the
timezone problem back.

<div class="compare">
  <div class="dont">
    <p class="label">Dates that look the same</p>
    <p><code>"date": "2083-08-03"</code>. Is that Mangsir 3, 2083 BS, or 3
    August 2083 AD? Both are valid dates, so nothing will warn you.</p>
  </div>
  <div class="do">
    <p class="label">Say which calendar</p>
    <p>Store AD, and name every field after its calendar:
    <code>issuedOnAd</code>, <code>issuedOnBs</code>.</p>
  </div>
</div>

### Fiscal years

Billing and payroll apps need the fiscal year more than the calendar year.
It starts on Shrawan 1, month 4, so the first three months of a BS year
belong to the fiscal year that started the July before:

```ts
function fiscalYear({ year, month }) {
  const start = month >= 4 ? year : year - 1
  return `${start}/${String((start + 1) % 100).padStart(2, "0")}`
}

fiscalYear({ year: 2083, month: 8 }) // "2083/84"
fiscalYear({ year: 2084, month: 2 }) // "2083/84"
```

## What to take from it

- **Check where your converter's table comes from**, and what it does after
  2083 BS.
- **Work out "today" in `Asia/Kathmandu`**, and only in the browser.
- **Store AD, show BS, and label every field** with its calendar.
- **Throw on impossible dates** instead of rolling them over.
- **Update your table** when the official 2084 calendar is published.

Bikram Sambat isn't hard because the maths is hard. It's hard because the
data is decided by people, one year at a time, and every library is only as
good as the copy it made.
