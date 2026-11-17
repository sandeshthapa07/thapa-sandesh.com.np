// Five search requests, one per letter of "react", racing back over a
// network with uneven response times. "Set state on arrival" is the plain
// useEffect version: whatever lands last wins. "Latest query only" ignores
// responses for queries that are no longer current, which is what a cleanup
// flag does by hand and what Suspense with `use` does by keying data on the
// query.
import type { FigureSpec, G, Point } from "@safis/core"

const QUERIES = ["r", "re", "rea", "reac", "react"]
const SENT = [0, 130, 260, 390, 520] // ms, one keystroke every 130 ms
const START: Array<number> = [380, 1150, 520, 720, 420] // response times, ms
const MIN = 60
const MAX = 1500

type Mode = "effect" | "latest"
type Shown = { from: number; query: number | null }

/** What the results list shows over time, as a list of changes. */
export function screen(durations: Array<number>, mode: Mode) {
  const arrivals = durations
    .map((d, i) => ({ at: SENT[i] + d, query: i }))
    .sort((a, b) => a.at - b.at)
  const changes: Array<Shown> = [{ from: 0, query: null }]
  const ignored = new Set<number>()
  // The query in the search box at time t.
  const current = (t: number) => SENT.filter((sent) => sent <= t).length - 1

  if (mode === "effect") {
    for (const { at, query } of arrivals) {
      changes.push({ from: at, query })
    }
  } else {
    for (const { at, query } of arrivals) {
      if (query === current(at)) changes.push({ from: at, query })
      else ignored.add(query)
    }
  }
  return { changes, ignored }
}

type State = { durations: Array<number>; drag: number | null }

export function requestRace(): FigureSpec<State> {
  // The time and row mapping from the last draw, for the drag callbacks.
  let P: { x: (ms: number) => number; row: (i: number) => number } | null = null
  const handleAt = (p: Point, s: State) => {
    const map = P
    if (!map) return -1
    return s.durations.findIndex(
      (d, i) => Math.hypot(p[0] - map.x(SENT[i] + d), p[1] - map.row(i)) < 22
    )
  }

  return {
    aspect: (w) => w / (w < 560 ? 270 : 250),
    state: () => ({ durations: [...START], drag: null }),
    controls: [
      {
        key: "mode",
        label: "Results",
        type: "choice",
        options: [
          { value: "effect", label: "Set state on arrival" },
          { value: "latest", label: "Latest query only" },
        ],
        value: "effect",
      },
      {
        label: "Shuffle response times",
        type: "button",
        action: (s) => {
          s.durations = s.durations.map(
            () =>
              Math.round((MIN + Math.random() * (MAX - MIN - 300)) / 10) * 10
          )
        },
      },
    ],
    reset: true,
    caption:
      'Typing "react" sends one search per letter. Each bar is a request in flight, ending when its response arrives; the bottom row is what the results list shows.',
    status: (s, v) => {
      const { changes } = screen(s.durations, v.mode)
      const last = changes.at(-1)?.query
      if (last === null || last === undefined) return "nothing shown"
      const right = last === QUERIES.length - 1
      return `ends on "${QUERIES[last]}"${right ? "" : ", the wrong query"}`
    },
    draw(g: G, s, v) {
      const narrow = g.w < 560
      const left = narrow ? 66 : 70
      const right = g.w - 16
      const arrive = s.durations.map((d, i) => SENT[i] + d)
      const span = g.ease("span", Math.max(1000, ...arrive) + 180)
      const x = (ms: number) => left + (ms / span) * (right - left)
      const row = (i: number) => 18 + i * 30
      P = { x, row }
      const { changes, ignored } = screen(s.durations, v.mode)
      const screenY = row(QUERIES.length) + 14

      // One row per request: sent (blue), in flight (orange), arrived.
      QUERIES.forEach((query, i) => {
        const y = row(i)
        const end = x(arrive[i])
        const dropped = ignored.has(i)
        g.text(`"${query}"`, [left - 10, y], {
          color: "muted",
          size: narrow ? 11 : 12,
          font: "mono",
          align: "right",
          baseline: "middle",
        })
        g.line([x(SENT[i]), y], [end, y], {
          stroke: dropped ? "faint" : "orange",
          width: 4,
          alpha: dropped ? 1 : 0.55,
        })
        g.circle([x(SENT[i]), y], 4, { fill: "blue" })
        g.handle([end, y], {
          color: dropped ? "muted" : "orange",
          active: s.drag === i,
        })
        if (dropped) {
          g.text("ignored", [end + 12, y], {
            color: "muted",
            size: 11,
            align: "left",
            baseline: "middle",
          })
        }
      })

      // The results list over time.
      g.text("screen", [left - 10, screenY + 9], {
        color: "muted",
        size: 12,
        align: "right",
        baseline: "middle",
      })
      changes.forEach((change, i) => {
        const from = x(change.from)
        const to = x(changes[i + 1]?.from ?? span)
        const last = i === changes.length - 1
        if (change.query === null) {
          g.rect(from, screenY, to - from, 18, { fill: "grid", r: 3 })
          return
        }
        const color = last
          ? change.query === QUERIES.length - 1
            ? "green"
            : "red"
          : "muted"
        g.rect(from + 1, screenY, Math.max(2, to - from - 2), 18, {
          fill: g.rgba(color, last ? 0.22 : 0.12),
          r: 3,
        })
        const text = `"${QUERIES[change.query]}"`
        if (to - from > g.measure(text, { size: 11, font: "mono" }) + 8) {
          g.text(text, [(from + to) / 2, screenY + 9], {
            color: last ? color : "muted",
            size: 11,
            font: "mono",
            weight: last ? 700 : 500,
            align: "center",
            baseline: "middle",
          })
        }
        // Tie each change to the response that caused it.
        const y = row(change.query)
        g.line([from, y + 6], [from, screenY], {
          stroke: "muted",
          width: 1,
          dash: [2, 3],
          alpha: 0.6,
        })
      })

      // Time axis.
      const axisY = screenY + 34
      g.line([left, axisY], [right, axisY], { stroke: "faint", width: 1 })
      for (let ms = 0; ms <= span; ms += 500) {
        g.line([x(ms), axisY], [x(ms), axisY + 4], {
          stroke: "muted",
          width: 1,
        })
        g.text(ms === 0 ? "0" : `${ms / 1000} s`, [x(ms), axisY + 13], {
          color: "muted",
          size: 11,
          align: "center",
          baseline: "middle",
        })
      }
    },
    drag: {
      hit: (p: Point, s) => handleAt(p, s) >= 0,
      start(p: Point, s) {
        s.drag = handleAt(p, s)
      },
      move(p: Point, s) {
        if (!P || s.drag === null) return
        const left = P.x(0)
        const perMs = P.x(1) - left
        const ms = (p[0] - left) / perMs - SENT[s.drag]
        s.durations[s.drag] =
          Math.round(Math.min(MAX, Math.max(MIN, ms)) / 10) * 10
      },
      end(s) {
        s.drag = null
      },
    },
  }
}
