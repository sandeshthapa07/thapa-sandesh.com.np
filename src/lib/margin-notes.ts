// Hand-drawn brackets for margin notes ({>> … <<} in a post), after the
// annotations on benji.org. On wide screens a "]" closes off the paragraph
// and the note sits beside it; on narrow ones the bracket runs under the
// paragraph and the note sits below. Each bracket draws itself once, when
// its note scrolls into view, and then the note writes itself out, letter
// by letter. styles.css holds the timing.

const SVG = "http://www.w3.org/2000/svg"
const BRACKET = 12 // px across the short side of the bracket

export function drawMarginNotes(root: HTMLElement) {
  const notes = root.querySelectorAll<HTMLElement>(".margin-note")
  if (!notes.length) return undefined

  const wide = window.matchMedia("(width >= 75rem)")
  const still = window.matchMedia("(prefers-reduced-motion: reduce)")
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        observer.unobserve(entry.target)
        ;(entry.target as HTMLElement).dataset.bracket = "drawn"
      }
    },
    { rootMargin: "0px 0px -12% 0px" }
  )
  const resizers: Array<ResizeObserver> = []
  const brackets: Array<SVGSVGElement> = []
  const restores: Array<() => void> = []

  notes.forEach((note, index) => {
    const svg = document.createElementNS(SVG, "svg")
    brackets.push(svg)
    svg.setAttribute("class", "margin-note-bracket")
    svg.setAttribute("aria-hidden", "true")
    // Two slightly different strokes, like a pen going over a line twice.
    const strokes = [0, 1].map(() => {
      const path = document.createElementNS(SVG, "path")
      path.setAttribute("pathLength", "1")
      svg.append(path)
      return path
    })
    note.prepend(svg)
    note.classList.add("has-bracket")

    // offsetWidth/Height ignore the note's slight rotation.
    const draw = () => {
      const vertical = wide.matches
      const w = vertical ? BRACKET : note.offsetWidth
      const h = vertical ? note.offsetHeight : BRACKET
      svg.setAttribute("width", String(w))
      svg.setAttribute("height", String(h))
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`)
      strokes.forEach((path, pass) => {
        path.setAttribute(
          "d",
          bracket(w, h, vertical, index * 13 + pass * 7 + 3)
        )
      })
    }
    draw()
    const resizer = new ResizeObserver(draw)
    resizer.observe(note)
    resizers.push(resizer)

    if (still.matches) {
      note.dataset.bracket = "drawn"
      return
    }
    const restore = splitLetters(note)
    if (restore) restores.push(restore)
    observer.observe(note)
  })

  // Undo everything, so running this again starts clean. React's Strict Mode
  // runs effects twice in development; keeping the first run's brackets
  // after disconnecting its observer would leave them never drawn.
  return () => {
    observer.disconnect()
    for (const resizer of resizers) resizer.disconnect()
    for (const svg of brackets) svg.remove()
    for (const restore of restores) restore()
    notes.forEach((note) => {
      note.classList.remove("has-bracket")
      delete note.dataset.bracket
    })
  }
}

// Wraps each letter of a note in its own span, with a delay that grows
// letter by letter, so CSS can write the note out in order across lines.
// Letters sit inside a span per word, which keeps words from breaking
// between letters. Screen readers get the sentence once, from a hidden copy,
// instead of letter by letter. Returns a function that puts the text back.
function splitLetters(note: HTMLElement) {
  const text = note.querySelector<HTMLElement>(".margin-note-text")
  // Links or code would be hidden from screen readers with the copy; leave
  // those notes as they are.
  if (!text?.textContent || text.querySelector("a, button, code")) {
    return undefined
  }
  const original = text.innerHTML
  const copy = document.createElement("span")
  copy.className = "visually-hidden"
  copy.textContent = text.textContent
  text.before(copy)
  text.setAttribute("aria-hidden", "true")

  // About 30ms a letter, but never much more than a second for the note.
  const letters = text.textContent.replace(/\s/g, "").length
  const step = Math.min(30, 1100 / letters)
  let index = 0
  const walker = document.createTreeWalker(text, NodeFilter.SHOW_TEXT)
  const nodes: Array<Text> = []
  while (walker.nextNode()) nodes.push(walker.currentNode as Text)
  for (const node of nodes) {
    const parts = document.createDocumentFragment()
    for (const part of node.data.split(/(\s+)/)) {
      if (!part) continue
      if (/^\s+$/.test(part)) {
        parts.append(part)
        continue
      }
      const word = document.createElement("span")
      word.className = "margin-note-word"
      for (const char of part) {
        const letter = document.createElement("span")
        letter.className = "margin-note-letter"
        letter.style.setProperty("--delay", `${Math.round(index * step)}ms`)
        letter.textContent = char
        word.append(letter)
        index++
      }
      parts.append(word)
    }
    node.replaceWith(parts)
  }

  return () => {
    text.innerHTML = original
    text.removeAttribute("aria-hidden")
    copy.remove()
  }
}

// A bracket path in pixels, with a little seeded wobble so no two look alike.
//   vertical: "]" — a tick in at the top, down the right, a tick back out.
//   otherwise: a tick down at the left, across the bottom, a tick back up.
function bracket(w: number, h: number, vertical: boolean, seed: number) {
  let state = seed
  const wobble = (value: number, amount = 1.2) => {
    state = (state * 9301 + 49297) % 233280
    return (value + (state / 233280 - 0.5) * amount).toFixed(1)
  }
  if (vertical) {
    const x = w - 3
    return [
      `M ${wobble(1)} ${wobble(2)}`,
      `Q ${wobble(x * 0.6)} ${wobble(1.5)} ${wobble(x)} ${wobble(3.5)}`,
      `Q ${wobble(x + 1.2, 1.6)} ${wobble(h / 2, 6)} ${wobble(x)} ${wobble(h - 3.5)}`,
      `Q ${wobble(x * 0.6)} ${wobble(h - 1.5)} ${wobble(1)} ${wobble(h - 2)}`,
    ].join(" ")
  }
  const y = h - 3
  return [
    `M ${wobble(2)} ${wobble(1)}`,
    `Q ${wobble(1.5)} ${wobble(y * 0.6)} ${wobble(3.5)} ${wobble(y)}`,
    `Q ${wobble(w / 2, 8)} ${wobble(y + 1.2, 1.6)} ${wobble(w - 3.5)} ${wobble(y)}`,
    `Q ${wobble(w - 1.5)} ${wobble(y * 0.6)} ${wobble(w - 2)} ${wobble(1)}`,
  ].join(" ")
}
