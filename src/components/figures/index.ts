// Live figures inside posts, drawn with the safis runtime (@safis/core).
// A post adds one with `<figure class="explorable" id="<name>" aria-label="…">`
// and the id picks the spec below. Prose can drive a figure with
// `<span class="scrub" data-figure="<id>" data-key="<control>">` and
// `<button class="set" data-figure="<id>" data-set="key=value">`.
// This module is large (the runtime is ~560 KB gzipped), so routes/writing
// loads it only when a figure is about to scroll into view.
import "@safis/core/scoped.css"
import { enhance, mount } from "@safis/core"
import { agentSteps } from "./agent-steps"
import { mainThread } from "./main-thread"
import { rendering } from "./rendering"
import { requestRace } from "./request-race"
import type { FigureHandle, FigureSpec } from "@safis/core"

const specs: Record<string, () => FigureSpec> = {
  "agent-steps": agentSteps,
  "main-thread": mainThread,
  rendering,
  "request-race": requestRace,
}

/**
 * The runtime picks its palette from `data-theme` on <html>, while the site
 * keeps its light/dark override in <meta name="color-scheme"> (lib/theme.ts).
 * Mirror one onto the other; changing the attribute also makes the runtime
 * read the colors again and redraw.
 */
function followSiteTheme() {
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="color-scheme"]'
  )
  if (!meta) return
  const apply = () => {
    const root = document.documentElement
    const scheme = meta.content
    if (scheme === "light" || scheme === "dark") {
      if (root.dataset.theme !== scheme) root.dataset.theme = scheme
    } else if (root.dataset.theme !== undefined) {
      delete root.dataset.theme
    }
  }
  apply()
  new MutationObserver(apply).observe(meta, {
    attributes: true,
    attributeFilter: ["content"],
  })
}

followSiteTheme()

/** Mounts every figure under `root`. Returns a function that removes them. */
export function mountFigures(root: HTMLElement) {
  const handles: Array<FigureHandle> = []
  for (const el of root.querySelectorAll<HTMLElement>("figure.explorable")) {
    const spec = specs[el.id] as (() => FigureSpec) | undefined
    if (!spec) {
      console.error(`No figure named "${el.id}" in components/figures`)
      continue
    }
    el.classList.add("demo", "safis")
    handles.push(mount(el, spec))
  }
  enhance(root)
  return () => {
    for (const handle of handles) handle.destroy()
  }
}
