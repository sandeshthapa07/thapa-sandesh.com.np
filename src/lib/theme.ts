/**
 * Flips between the light and dark theme and remembers the choice. Given an
 * origin, the new theme spreads out from that point as a growing circle,
 * where view transitions are supported.
 */
export function toggleTheme(origin?: { x: number; y: number }) {
  const apply = () => {
    const dark = document.documentElement.classList.toggle("dark")
    try {
      localStorage.setItem("theme", dark ? "dark" : "light")
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

/** Viewport centre of an element, as an origin for `toggleTheme`. */
export function centerOf(element: Element) {
  const rect = element.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}
