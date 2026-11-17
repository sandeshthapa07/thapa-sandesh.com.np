// 100 agents attempt the same task. Driving the UI takes `steps` guesses,
// and a run only finishes if every guess is right; a tool call is one step.
// The draws are seeded, so the same settings always show the same runs until
// the reader asks for a new batch.
import type { FigureSpec, G } from "@safis/core"

const RUNS = 100
const MAX_STEPS = 25

/** mulberry32: a small seeded random number generator. */
function random(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function roll(seed: number) {
  const next = random(seed)
  return {
    seed,
    draws: Array.from({ length: RUNS }, () =>
      Array.from({ length: MAX_STEPS }, next)
    ),
    tool: Array.from({ length: RUNS }, next),
  }
}

type State = ReturnType<typeof roll> & { reveal: number }

/** How many runs are still going after each step (index 0 is the start). */
export function survivors(
  draws: Array<Array<number>>,
  p: number,
  steps: number
) {
  const counts = [draws.length]
  for (let k = 1; k <= steps; k++) {
    counts.push(
      draws.filter((run) => run.slice(0, k).every((r) => r < p)).length
    )
  }
  return counts
}

const reducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches

export function agentSteps(): FigureSpec<State> {
  return {
    aspect: (w) => w / (w < 560 ? 256 : 244),
    // Seed 384 lands on the averages at the defaults (54 and 95 of 100), so
    // the first batch a reader sees matches the numbers in the text.
    state: () => ({ ...roll(384), reveal: 99 }),
    controls: [
      {
        key: "p",
        label: "Each step right",
        min: 80,
        max: 99.5,
        step: 0.5,
        value: 95,
        format: (value) => `${value}%`,
        color: "blue",
      },
      {
        key: "steps",
        label: "Steps",
        type: "stepper",
        min: 1,
        max: MAX_STEPS,
        step: 1,
        value: 12,
      },
      {
        label: "Run 100 agents again",
        type: "button",
        action: (s, _v, fig) => {
          Object.assign(s, roll(s.seed + 1))
          s.reveal = reducedMotion() ? 99 : 0
          if (!reducedMotion()) fig.play()
        },
      },
    ],
    transport: false,
    // Still until the button runs a new batch.
    autoplay: false,
    caption:
      "100 runs of the same task. Blue bars are runs still going after each step, red is where runs failed; the dashed line is the average you'd expect.",
    change(_key, s) {
      s.reveal = 99
    },
    step(dt, s, v, fig) {
      s.reveal += dt * 9
      if (s.reveal > v.steps + 1) fig.play(false)
    },
    status: (s, v) => {
      const ui = survivors(s.draws, v.p / 100, v.steps).at(-1)
      const tool = s.tool.filter((r) => r < v.p / 100).length
      return `driving the UI: ${ui} of 100 finish · tool call: ${tool} of 100`
    },
    draw(g: G, s, v) {
      const narrow = g.w < 560
      const p = v.p / 100
      const n: number = v.steps
      const counts = survivors(s.draws, p, n)
      const tool = s.tool.filter((r) => r < p).length
      const left = narrow ? 30 : 40
      const right = g.w - 12
      const top = 44
      const base = g.h - 34
      const h = base - top
      const toolW = narrow ? 56 : 84
      const col = (right - left - toolW - 18) / (n + 1)
      const barW = Math.max(3, Math.min(30, col * 0.62))
      const cx = (k: number) => left + col * (k + 0.5)
      const y = (count: number) => base - (count / RUNS) * h

      // Scale.
      for (const tick of [0, 50, 100]) {
        g.line([left, y(tick)], [right, y(tick)], { stroke: "grid", width: 1 })
        g.text(String(tick), [left - 6, y(tick)], {
          color: "muted",
          size: 11,
          align: "right",
          baseline: "middle",
        })
      }
      g.text("Driving the UI", [left, 12], {
        color: "ink",
        size: 12,
        weight: 600,
        align: "left",
        baseline: "middle",
      })
      g.text("One tool call", [right - toolW / 2, 12], {
        color: "ink",
        size: 12,
        weight: 600,
        align: "center",
        baseline: "middle",
      })

      // Runs still going after each step, revealed one step at a time.
      counts.forEach((count, k) => {
        if (k > s.reveal) return
        const grow = Math.min(1, s.reveal - k + 0.0001)
        const height = (count / RUNS) * h * grow
        const lost = k > 0 ? counts[k - 1] - count : 0
        g.rect(cx(k) - barW / 2, base - height, barW, height, {
          fill: "blue",
          r: 2,
        })
        if (lost > 0) {
          const lostH = (lost / RUNS) * h * grow
          g.rect(cx(k) - barW / 2, base - height - lostH, barW, lostH, {
            fill: g.rgba("red", 0.55),
            r: 2,
          })
        }
        const every = n > 14 ? (narrow ? 6 : 3) : narrow ? 3 : 1
        const nearEnd = k !== n && n - k < every
        if (k === 0 || k === n || (k % every === 0 && !nearEnd)) {
          g.text(k === 0 ? "start" : String(k), [cx(k), base + 12], {
            color: "muted",
            size: 11,
            align: "center",
            baseline: "middle",
          })
        }
      })
      if (s.reveal >= n) {
        g.text(String(counts[n]), [cx(n), y(counts[Math.max(0, n - 1)]) - 10], {
          color: "blue",
          size: 13,
          weight: 700,
          align: "center",
          baseline: "middle",
        })
      }

      // The average: p to the power of the step.
      const expected = Array.from<unknown, [number, number]>(
        { length: n + 1 },
        (_, k) => [cx(k), y(RUNS * p ** k)]
      )
      g.path(expected, { stroke: "muted", width: 1.25, dash: [4, 4] })
      g.text("steps", [cx(n), base + 26], {
        color: "muted",
        size: 11,
        align: "center",
        baseline: "middle",
      })

      // The tool call: one step.
      const tx = right - toolW / 2
      const tw = Math.min(40, toolW * 0.5)
      g.line([right - toolW, top - 6], [right - toolW, base], {
        stroke: "faint",
        width: 1,
      })
      if (s.reveal >= 1) {
        g.rect(tx - tw / 2, y(tool), tw, base - y(tool), {
          fill: "green",
          r: 2,
        })
        g.rect(tx - tw / 2, y(RUNS), tw, y(tool) - y(RUNS), {
          fill: g.rgba("red", 0.55),
          r: 2,
        })
        g.text(String(tool), [tx, y(RUNS) - 10], {
          color: "green",
          size: 13,
          weight: 700,
          align: "center",
          baseline: "middle",
        })
      }
      g.text("1 step", [tx, base + 12], {
        color: "muted",
        size: 11,
        align: "center",
        baseline: "middle",
      })
    },
  }
}
