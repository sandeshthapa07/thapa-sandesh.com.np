// The main thread while someone types "async react": every keystroke is an
// event the browser has to handle, and every render of the slow chart is a
// block of work. Without a transition each keystroke renders the chart
// before its letter can paint; with one, React renders the chart in ~5 ms
// slices, handles input between them, and drops renders that are out of date.
import type { FigureSpec, G } from "@safis/core"

const TEXT = "async react"
const FIRST_KEY = 60 // ms
const KEY_GAP = 110 // ms between keystrokes, about nine letters a second
const INPUT_COST = 2 // ms to render just the input (the chart is memoized)
const SLICE = 5 // React's scheduler yields to the browser about every 5 ms
const INSTANT = 100 // ms: past this, a response stops feeling instant (RAIL)

type Kind = "input" | "render" | "dropped"
type Block = { start: number; end: number; kind: Kind; job?: number }

export type Timeline = {
  keys: Array<number> // when each letter was typed
  shown: Array<number> // when each letter reached the screen
  charts: Array<{ at: number; letters: number }> // chart commits
  blocks: Array<Block>
  end: number
}

export function schedule(cost: number, transition: boolean): Timeline {
  const keys = Array.from(TEXT, (_, i) => FIRST_KEY + i * KEY_GAP)
  const blocks: Array<Block> = []
  const shown: Array<number> = []
  const charts: Timeline["charts"] = []
  const dropped = new Set<number>()
  let t = 0
  let next = 0 // next keystroke to handle
  let job = -1 // the transition render in progress
  let done = 0 // ms of it rendered so far
  let pending = false

  while (next < keys.length || pending) {
    if (next < keys.length && keys[next] <= t) {
      // Input is urgent: the browser handles the keystroke as soon as the
      // thread is free.
      blocks.push({ start: t, end: t + INPUT_COST, kind: "input" })
      t += INPUT_COST
      next++
      if (transition) {
        shown.push(t)
        if (pending && done > 0) dropped.add(job) // outdated: start again
        job++
        done = 0
        pending = true
      } else {
        // A normal update renders the chart before the letter can paint.
        blocks.push({ start: t, end: t + cost, kind: "render" })
        t += cost
        shown.push(t)
        charts.push({ at: t, letters: next })
      }
    } else if (pending) {
      const slice = Math.min(SLICE, cost - done)
      blocks.push({ start: t, end: t + slice, kind: "render", job })
      t += slice
      done += slice
      if (done >= cost) {
        pending = false
        charts.push({ at: t, letters: next })
      }
    } else {
      t = keys[next] // idle until the next keystroke
    }
  }

  for (const block of blocks) {
    if (block.job !== undefined && dropped.has(block.job)) {
      block.kind = "dropped"
    }
  }
  return { keys, shown, charts, blocks: merge(blocks), end: t }
}

/** Joins touching blocks of the same kind and render, for drawing. */
function merge(blocks: Array<Block>) {
  const out: Array<Block> = []
  for (const block of blocks) {
    const last = out.at(-1)
    if (
      last &&
      last.kind === block.kind &&
      last.job === block.job &&
      Math.abs(last.end - block.start) < 0.01
    ) {
      last.end = block.end
    } else {
      out.push({ ...block })
    }
  }
  return out
}

const delays = (line: Timeline) =>
  line.keys.map((key, i) => line.shown[i] - key)

type State = { t: number; line: Timeline }

export function mainThread(): FigureSpec<State> {
  const fresh = (cost = 200, transition = false) => schedule(cost, transition)
  return {
    aspect: (w) => w / 228,
    state: () => {
      const line = fresh()
      // Readers who prefer less motion get the figure paused, so show them
      // the finished state rather than an empty readout.
      const still = matchMedia("(prefers-reduced-motion: reduce)").matches
      return { t: still ? line.end + 400 : 0, line }
    },
    controls: [
      {
        key: "cost",
        label: "Chart render",
        min: 10,
        max: 400,
        step: 10,
        value: 200,
        unit: "ms",
        color: "orange",
        marks: [{ value: 200, label: "100 bars" }],
      },
      {
        key: "transition",
        label: "Render the chart in a transition",
        type: "toggle",
        value: false,
        color: "blue",
      },
    ],
    caption:
      'Typing "async react" while a slow chart re-renders. Slanted lines join each keystroke to the moment its letter reaches the screen; red ones took longer than 100 ms.',
    change(_key, s, v) {
      s.line = fresh(v.cost, v.transition)
    },
    status: (s) => {
      const worst = Math.max(...delays(s.line))
      return `slowest letter ${Math.round(worst)} ms`
    },
    step(dt, s) {
      s.t += dt * 1000 * 0.6
      if (s.t > s.line.end + 900) s.t = 0
    },
    draw(g: G, s) {
      const { line } = s
      const narrow = g.w < 560
      const left = narrow ? 56 : 92
      const right = g.w - 14
      const span = g.ease(
        "span",
        Math.max(line.end, line.keys.at(-1)! + 300) + 60
      )
      const x = (ms: number) => left + (ms / span) * (right - left)
      const typedNow = line.keys.filter((k) => k <= s.t).length
      const shownNow = line.shown.filter((k) => k <= s.t).length
      const chartNow =
        line.charts.filter((c) => c.at <= s.t).at(-1)?.letters ?? 0

      // What the reader sees at the cursor.
      const rows: Array<[string, number, string]> = [
        [narrow ? "typed" : "you typed", typedNow, "ink"],
        [narrow ? "input" : "input shows", shownNow, "blue"],
        [narrow ? "chart" : "chart shows", chartNow, "orange"],
      ]
      rows.forEach(([name, letters, color], i) => {
        const y = 14 + i * 20
        g.text(name, [left - 10, y], {
          color: "muted",
          size: 12,
          align: "right",
          baseline: "middle",
        })
        g.text(TEXT.slice(0, letters) || "·", [left, y], {
          color: letters ? color : "faint",
          size: 14,
          font: "mono",
          align: "left",
          baseline: "middle",
        })
        if (i === 1 && letters < typedNow) {
          const w = g.measure(TEXT.slice(0, letters), {
            size: 14,
            font: "mono",
          })
          g.text(TEXT.slice(letters, typedNow), [left + w, y], {
            color: "red",
            size: 14,
            font: "mono",
            align: "left",
            baseline: "middle",
            alpha: 0.45,
          })
        }
      })

      const keysY = 94
      const threadY = 114
      const threadH = 22
      const screenY = 164
      const axisY = 206
      const label = (text: string, y: number) =>
        g.text(text, [left - 10, y], {
          color: "muted",
          size: 12,
          align: "right",
          baseline: "middle",
        })
      label(narrow ? "keys" : "keystrokes", keysY)
      label(narrow ? "thread" : "main thread", threadY + threadH / 2)
      label("screen", screenY)

      // Delay from keystroke to letter on screen.
      line.keys.forEach((key, i) => {
        const late = line.shown[i] - key > INSTANT
        g.line([x(key), keysY + 6], [x(line.shown[i]), screenY - 6], {
          stroke: late ? "red" : "blue",
          width: 1.25,
          alpha: late ? 0.7 : 0.45,
        })
      })

      // Keystrokes and the letters they type.
      line.keys.forEach((key, i) => {
        g.line([x(key), keysY - 6], [x(key), keysY + 6], {
          stroke: "blue",
          width: 2,
        })
        if (!narrow || i % 2 === 0) {
          g.text(TEXT[i] === " " ? "␣" : TEXT[i], [x(key), keysY - 15], {
            color: "muted",
            size: 11,
            font: "mono",
            align: "center",
            baseline: "middle",
          })
        }
      })

      // The main thread: idle track, then the work on it.
      g.rect(left, threadY, right - left, threadH, { fill: "grid", r: 3 })
      for (const block of line.blocks) {
        const bx = x(block.start)
        const bw = Math.max(1.5, x(block.end) - bx)
        if (block.kind === "input") {
          g.rect(bx, threadY, bw, threadH, { fill: "blue" })
        } else if (block.kind === "render") {
          g.rect(bx, threadY, bw, threadH, {
            fill: g.lit("render") ? "orange" : g.rgba("orange", 0.75),
          })
        } else {
          g.rect(bx, threadY, bw, threadH, {
            fill: g.rgba("orange", 0.12),
            hatch: g.rgba("orange", 0.7),
            hatchGap: 4,
          })
        }
      }

      // The screen: letters landing, and the chart catching up.
      g.line([left, screenY], [right, screenY], { stroke: "faint", width: 1 })
      line.shown.forEach((at, i) => {
        const late = at - line.keys[i] > INSTANT
        g.line([x(at), screenY - 6], [x(at), screenY + 6], {
          stroke: late ? "red" : "blue",
          width: 2,
        })
      })
      for (const chart of line.charts) {
        g.rect(x(chart.at) - 3, screenY + 10, 6, 6, { fill: "orange", r: 1 })
      }
      const lastChart = line.charts.at(-1)
      if (lastChart && !narrow) {
        const atRight = x(lastChart.at) > right - 40
        g.text("chart", [x(lastChart.at) + (atRight ? -8 : 8), screenY + 13], {
          color: "orange",
          size: 11,
          align: atRight ? "right" : "left",
          baseline: "middle",
        })
      }

      // Time axis.
      const tick = span > 2500 ? 1000 : 500
      for (let ms = 0; ms <= span; ms += tick) {
        g.line([x(ms), axisY - 4], [x(ms), axisY], {
          stroke: "muted",
          width: 1,
        })
        g.text(ms === 0 ? "0" : `${ms / 1000} s`, [x(ms), axisY + 10], {
          color: "muted",
          size: 11,
          align: "center",
          baseline: "middle",
        })
      }
      g.line([left, axisY - 4], [right, axisY - 4], {
        stroke: "faint",
        width: 1,
      })

      // Playback cursor.
      if (s.t <= span) {
        g.line([x(s.t), keysY - 24], [x(s.t), axisY - 4], {
          stroke: "ink",
          width: 1,
          alpha: 0.35,
        })
      }
    },
  }
}
