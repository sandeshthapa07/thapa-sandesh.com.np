// The same page delivered four ways, as a timeline from the first request to
// "content on screen" and "interactive". A deliberately simple model:
// - network and CPU from Lighthouse's throttling presets (desktop: 40 ms
//   RTT, 10 Mbps, 1x CPU; mobile: 150 ms RTT, 1.6 Mbps, 4x slower CPU);
// - 3 round trips to connect, then 1 per request, nothing in parallel;
// - a 30 KB HTML page (3 KB for the SPA shell), 150 ms to server-render,
//   a 20 KB API response that takes the server 100 ms;
// - 1 ms of parsing and running per KB of compressed JavaScript on a laptop;
// - islands ship only their widgets' code, assumed 30 KB at most.
import type { FigureSpec, G } from "@safis/core"

const NETWORKS = {
  desktop: { rtt: 40, kbPerMs: 10240 / 8 / 1000, cpu: 1 },
  mobile: { rtt: 150, kbPerMs: 1638.4 / 8 / 1000, cpu: 4 },
}
const HTML_KB = 30
const SHELL_KB = 3
const SSR_MS = 150
const API_MS = 100
const API_KB = 20
const JS_MS_PER_KB = 1
const ISLAND_KB = 30
const PAINT_MS = 30

type Net = keyof typeof NETWORKS
type Mode = "static" | "ssr" | "spa" | "islands"
type Kind = "connect" | "wait" | "server" | "html" | "js" | "run" | "data"
type Segment = { kind: Kind; start: number; end: number }

const MODES: Array<{ mode: Mode; label: string }> = [
  { mode: "static", label: "Static" },
  { mode: "ssr", label: "SSR" },
  { mode: "spa", label: "SPA" },
  { mode: "islands", label: "Islands" },
]

export function deliver(mode: Mode, jsKb: number, net: Net) {
  const { rtt, kbPerMs, cpu } = NETWORKS[net]
  const segments: Array<Segment> = []
  let t = 0
  const add = (kind: Kind, ms: number) => {
    segments.push({ kind, start: t, end: t + ms })
    t += ms
  }
  const loadJs = (kb: number) => {
    if (kb <= 0) return
    add("wait", rtt)
    add("js", kb / kbPerMs)
    add("run", kb * JS_MS_PER_KB * cpu)
  }

  add("connect", 3 * rtt)
  if (mode === "spa") {
    add("wait", rtt)
    add("html", SHELL_KB / kbPerMs)
    loadJs(jsKb)
    add("wait", rtt)
    add("server", API_MS)
    add("data", API_KB / kbPerMs)
    const content = t + PAINT_MS * cpu
    return { segments, content, interactive: content }
  }

  if (mode === "ssr") {
    add("wait", rtt)
    add("server", SSR_MS)
  } else {
    add("wait", rtt)
  }
  add("html", HTML_KB / kbPerMs)
  const content = t + PAINT_MS * cpu
  loadJs(mode === "islands" ? Math.min(jsKb, ISLAND_KB) : jsKb)
  return { segments, content, interactive: Math.max(content, t) }
}

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`

export function rendering(): FigureSpec {
  return {
    aspect: (w) => w / 276,
    controls: [
      {
        key: "net",
        label: "Device",
        type: "choice",
        options: [
          { value: "mobile", label: "Phone, slow 4G" },
          { value: "desktop", label: "Laptop, fast network" },
        ],
        value: "mobile",
      },
      {
        key: "js",
        label: "JavaScript",
        min: 0,
        max: 1000,
        step: 10,
        value: 300,
        unit: "KB",
        color: "orange",
      },
    ],
    caption:
      "One page, four ways to deliver it. A simplified model: Lighthouse's network and CPU presets, one request at a time, and about 1 ms per KB of compressed JavaScript on a laptop (4× that on the phone).",
    status: (_s, v) => {
      const spa = deliver("spa", v.js, v.net)
      const islands = deliver("islands", v.js, v.net)
      return `SPA usable at ${seconds(spa.interactive)}, islands at ${seconds(islands.interactive)}`
    },
    draw(g: G, _s, v) {
      const narrow = g.w < 560
      const left = narrow ? 56 : 74
      const right = g.w - 16
      const rows = MODES.map(({ mode, label }) => ({
        label,
        ...deliver(mode, v.js, v.net),
      }))
      const end = Math.max(...rows.map((r) => r.interactive))
      const span = g.ease("span", Math.max(1000, end * 1.08))
      const x = (ms: number) => left + (ms / span) * (right - left)

      // Legend.
      const legend: Array<[string, string, string]> = [
        ["html", "blue", "HTML"],
        ["server", "purple", "server"],
        ["js", "orange", "JS download"],
        ["run", "orange", "JS running"],
      ]
      let lx = narrow ? 4 : left
      for (const [kind, color, text] of legend) {
        g.rect(lx, 6, 12, 8, {
          fill: kind === "js" ? g.rgba(color, 0.35) : color,
          r: 2,
        })
        g.text(text, [lx + 16, 10], {
          color: "muted",
          size: 11,
          align: "left",
          baseline: "middle",
        })
        lx += 16 + g.measure(text, { size: 11 }) + 14
      }

      rows.forEach((row, i) => {
        const y = 44 + i * 46
        g.text(row.label, [left - 10, y + 6], {
          color: "ink",
          size: 12,
          weight: 600,
          align: "right",
          baseline: "middle",
        })
        g.rect(left, y + 5.5, x(row.interactive) - left, 1, { fill: "faint" })
        if (i === 0) {
          // The empty stretch before anything arrives: DNS, TCP and TLS.
          const connected = row.segments.find((seg) => seg.kind === "connect")
          if (connected && x(connected.end) - left > 64) {
            g.text("connecting", [(left + x(connected.end)) / 2, y - 6], {
              color: "muted",
              size: 11,
              align: "center",
              baseline: "middle",
            })
          }
        }
        for (const seg of row.segments) {
          const sx = x(seg.start)
          const sw = Math.max(1, x(seg.end) - sx)
          if (seg.kind === "connect" || seg.kind === "wait") continue
          const fill =
            seg.kind === "html" || seg.kind === "data"
              ? "blue"
              : seg.kind === "server"
                ? "purple"
                : seg.kind === "js"
                  ? g.rgba("orange", 0.35)
                  : "orange"
          g.rect(sx, y, sw, 12, { fill, r: 2 })
        }

        // Markers: content on screen, then interactive.
        const cx = x(row.content)
        const ix = x(row.interactive)
        g.circle([cx, y + 6], 5, { fill: "green" })
        if (ix - cx > 2) {
          g.circle([ix, y + 6], 5, { fill: "bg", stroke: "ink", width: 2 })
        } else {
          g.circle([ix, y + 6], 8, { stroke: "ink", width: 2 })
        }
        const labels: Array<[number, string, string]> =
          ix - cx > 2
            ? [
                [cx, seconds(row.content), "green"],
                [ix, seconds(row.interactive), "ink"],
              ]
            : [[ix, seconds(row.interactive), "ink"]]
        let lastEnd = -Infinity
        for (const [at, text, color] of labels) {
          const w = g.measure(text, { size: 11 })
          const at2 = Math.max(at, lastEnd + w / 2 + 6)
          g.text(text, [at2, y + 24], {
            color,
            size: 11,
            weight: 600,
            align: "center",
            baseline: "middle",
          })
          lastEnd = at2 + w / 2
        }
      })

      // Marker legend and time axis.
      const axisY = 44 + MODES.length * 46 + 2
      g.line([left, axisY], [right, axisY], { stroke: "faint", width: 1 })
      const tick = span > 6000 ? 2000 : span > 3000 ? 1000 : 500
      for (let ms = 0; ms <= span; ms += tick) {
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
      const ky = axisY + 30
      g.circle([left + 5, ky], 5, { fill: "green" })
      g.text("content on screen", [left + 14, ky], {
        color: "muted",
        size: 11,
        align: "left",
        baseline: "middle",
      })
      const kx = left + 30 + g.measure("content on screen", { size: 11 })
      g.circle([kx, ky], 5, { fill: "bg", stroke: "ink", width: 2 })
      g.text("interactive", [kx + 9, ky], {
        color: "muted",
        size: 11,
        align: "left",
        baseline: "middle",
      })
    },
  }
}
