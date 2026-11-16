/**
 * The site follows the system light/dark preference. The toggle stores an
 * override only while it differs from the system, so toggling back hands
 * control to the OS again. The override lives in <meta name="color-scheme">,
 * which styles.css maps onto CSS `color-scheme` and the `dark:` variant. The
 * inline script in routes/__root.tsx creates that meta before first paint.
 */

type Scheme = "light" | "dark"

const STORAGE_KEY = "theme"

const asScheme = (value: string | null): Scheme | null =>
  value === "light" || value === "dark" ? value : null

const systemScheme = (): Scheme =>
  matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"

function colorSchemeMeta() {
  let meta = document.querySelector<HTMLMetaElement>(
    'meta[name="color-scheme"]'
  )
  if (!meta) {
    meta = document.createElement("meta")
    meta.name = "color-scheme"
    meta.content = "light dark"
    document.head.append(meta)
  }
  return meta
}

/** Pins a scheme, or follows the system again when given `null`. */
function applyOverride(scheme: Scheme | null) {
  colorSchemeMeta().content = scheme ?? "light dark"
}

/**
 * Flips to the opposite of the scheme on screen and remembers the choice.
 * Given an origin, the new theme spreads out from that point as a growing
 * circle, where view transitions are supported.
 */
export function toggleTheme(origin?: { x: number; y: number }) {
  const rendered = asScheme(colorSchemeMeta().content) ?? systemScheme()
  const target: Scheme = rendered === "dark" ? "light" : "dark"
  // Landing back on the system scheme means the override is being undone.
  const override = target === systemScheme() ? null : target

  const apply = () => {
    applyOverride(override)
    try {
      if (override) localStorage.setItem(STORAGE_KEY, override)
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Storage can be blocked; the toggle still works for this visit.
    }
  }

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches
  if (!origin || reduceMotion || !("startViewTransition" in document)) {
    apply()
    return
  }

  const { x, y } = origin
  const radius = Math.hypot(
    Math.max(x, innerWidth - x),
    Math.max(y, innerHeight - y)
  )
  document
    .startViewTransition(apply)
    .ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 650,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          pseudoElement: "::view-transition-new(root)",
        }
      )
    })
    .catch(() => {
      // The transition was skipped; the theme has still been applied.
    })
}

/** Applies a theme change made in another tab. Returns a cleanup. */
export function syncThemeAcrossTabs() {
  const onStorage = (event: StorageEvent) => {
    // `key` is null when storage was cleared.
    if (event.key === null || event.key === STORAGE_KEY) {
      applyOverride(asScheme(event.newValue))
    }
  }
  addEventListener("storage", onStorage)
  return () => removeEventListener("storage", onStorage)
}

/** Viewport centre of an element, as an origin for `toggleTheme`. */
export function centerOf(element: Element) {
  const rect = element.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}
