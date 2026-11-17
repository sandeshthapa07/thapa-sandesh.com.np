import * as React from "react"
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react"
import * as ReactDOM from "react-dom"
import { Editor, LiveError, LivePreview, LiveProvider } from "react-live"
import type { ComponentProps, RefObject } from "react"
import { ErrorBoundary } from "./error-boundary"
import {
  NETWORKS,
  createFakeApi,
  createRequestLog,
  toNetwork,
  usesNetwork,
} from "./fake-api"
import type { LogEntry, Network, RequestLog, Settings } from "./fake-api"

// An editable code example with a live preview, used by posts through
// ```jsx playground fences (see plugins/markdown.ts). Code runs in this page
// with the site's own React, so every React 19 API is available.

export type PlaygroundProps = {
  code: string
  title: string
  network?: string
}

const NETWORK_LABELS: Record<Network, string> = {
  fast: "Fast",
  slow: "Slow",
  random: "Random",
}

// Playground code can import from "react", "react-dom",
// "react-error-boundary" and "./api". react-live runs a single script, so
// each import line becomes a lookup in this table, and code sees only the
// names it imports, as it would in a real module.
const IMPORT = /^import\s+([\s\S]*?)\s+from\s*["']([^"']+)["'];?[^\S\n]*$/gm

function toRunnable(code: string) {
  const body = code
    .replace(IMPORT, (_, clause: string, source: string) =>
      bindImport(clause.trim(), source)
    )
    .replace(/^export\s+(default\s+)?/gm, "")
  return `${body}\nrender(<App />)`
}

function bindImport(clause: string, source: string) {
  const module = `__module(${JSON.stringify(source)})`
  const bindings: Array<string> = []
  const defaultName = clause.match(/^([\w$]+)/)?.[1]
  const namespace = clause.match(/\*\s*as\s+([\w$]+)/)?.[1]
  const named = clause.match(/\{([\s\S]*)\}/)?.[1]
  // react-live already provides React itself, for JSX.
  if (defaultName && defaultName !== "React") {
    bindings.push(`const ${defaultName} = ${module}.default ?? ${module};`)
  }
  if (namespace && namespace !== "React") {
    bindings.push(`const ${namespace} = ${module};`)
  }
  if (named) {
    const names = named
      .split(",")
      .map((name) => name.trim().replace(/\s+as\s+/, ": "))
      .filter(Boolean)
    bindings.push(`const { ${names.join(", ")} } = ${module};`)
  }
  return bindings.join(" ")
}

function createModules(api: ReturnType<typeof createFakeApi>) {
  const modules: Record<string, object> = {
    react: React,
    "react-dom": ReactDOM,
    "react-error-boundary": { ErrorBoundary },
    "./api": api,
  }
  return (source: string) => {
    if (source in modules) return modules[source]
    throw new Error(
      `The playground can't import "${source}". Try "react", "react-dom", "react-error-boundary" or "./api".`
    )
  }
}

type Theme = NonNullable<ComponentProps<typeof Editor>["theme"]>

// Colours come from CSS variables (styles.css), so the editor follows the
// site's light and dark themes and matches the Shiki code blocks.
const theme: Theme = {
  plain: { color: "var(--pg-fg)", backgroundColor: "transparent" },
  styles: [
    {
      types: ["comment", "prolog", "doctype", "cdata"],
      style: { color: "var(--pg-comment)" },
    },
    {
      types: ["keyword", "operator", "imports", "module"],
      style: { color: "var(--pg-keyword)" },
    },
    {
      types: ["string", "char", "attr-value", "template-string", "regex"],
      style: { color: "var(--pg-string)" },
    },
    {
      types: ["function", "class-name", "maybe-class-name"],
      style: { color: "var(--pg-function)" },
    },
    { types: ["tag"], style: { color: "var(--pg-tag)" } },
    {
      types: ["attr-name", "property", "number", "boolean", "constant"],
      style: { color: "var(--pg-constant)" },
    },
    { types: ["punctuation"], style: { color: "var(--pg-fg)" } },
  ],
}

// Spread onto the toolbar: React passes the attribute through, but its types
// don't know focusgroup yet.
const focusgroup: Record<string, string> = { focusgroup: "toolbar wrap" }

export default function Playground({
  code: initialCode,
  title,
  network: initialNetwork,
}: PlaygroundProps) {
  const id = useId()
  const hasNetwork = usesNetwork(initialNetwork)
  const [network, setNetwork] = useState(() => toNetwork(initialNetwork))
  const [fail, setFail] = useState(false)
  const settings = useRef<Settings>({ network, fail })
  const [{ log, scope }] = useState(() => {
    const requestLog = createRequestLog()
    const api = createFakeApi(() => settings.current, requestLog)
    return { log: requestLog, scope: { __module: createModules(api) } }
  })

  // The editor's text, and the text the preview runs. The preview waits for
  // a pause in typing, so it doesn't restart (or report half-typed syntax
  // errors) on every keystroke.
  const [draft, setDraft] = useState(initialCode)
  const [code, setCode] = useState(initialCode)
  const [version, setVersion] = useState(0)
  const [status, setStatus] = useState("")

  useEffect(() => {
    if (draft === code) return
    const timer = setTimeout(() => setCode(draft), 400)
    return () => clearTimeout(timer)
  }, [draft, code])

  useEffect(() => {
    if (!status) return
    const timer = setTimeout(() => setStatus(""), 2000)
    return () => clearTimeout(timer)
  }, [status])

  function chooseNetwork(next: Network) {
    settings.current.network = next
    setNetwork(next)
  }

  function toggleFail() {
    settings.current.fail = !fail
    setFail(!fail)
  }

  function reset() {
    setDraft(initialCode)
    setCode(initialCode)
    setVersion((value) => value + 1)
    log.clear()
    setStatus("Code reset")
  }

  const editor = useRef<HTMLDivElement>(null)
  useEditorSemantics(editor, `Code editor: ${title}`, version)
  const toolbar = useRef<HTMLDivElement>(null)
  useRovingFocusFallback(toolbar)

  return (
    <div className="pg">
      <div className="pg-bar">
        <span className="pg-title">{title}</span>
        <div
          ref={toolbar}
          role="toolbar"
          aria-label="Playground controls"
          className="pg-tools"
          {...focusgroup}
        >
          {hasNetwork && (
            <>
              <div role="group" aria-labelledby={`${id}-network`}>
                <span id={`${id}-network`} className="pg-tools-label">
                  Network
                </span>
                {NETWORKS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={network === value}
                    onClick={() => chooseNetwork(value)}
                  >
                    {NETWORK_LABELS[value]}
                  </button>
                ))}
              </div>
              <span role="separator" aria-orientation="vertical" />
              <button type="button" aria-pressed={fail} onClick={toggleFail}>
                Fail requests
              </button>
              <span role="separator" aria-orientation="vertical" />
            </>
          )}
          <button type="button" onClick={reset}>
            Reset
          </button>
        </div>
      </div>

      <LiveProvider
        key={version}
        code={code}
        scope={scope}
        transformCode={toRunnable}
        noInline
        enableTypeScript={false}
      >
        <div className="pg-body">
          <div ref={editor} className="pg-editor">
            <Editor
              code={draft}
              language="jsx"
              theme={theme}
              tabMode="focus"
              onChange={setDraft}
            />
          </div>
          <div className="pg-output">
            <p className="pg-label">Preview</p>
            <LivePreview className="pg-preview" />
            <div aria-live="polite">
              <LiveError className="pg-error" />
            </div>
            {hasNetwork && <NetworkLog log={log} />}
          </div>
        </div>
      </LiveProvider>

      <p role="status" className="sr-only">
        {status}
      </p>
    </div>
  )
}

function NetworkLog({ log }: { log: RequestLog }) {
  const entries = useSyncExternalStore(
    log.subscribe,
    log.getSnapshot,
    log.getSnapshot
  )

  return (
    <div className="pg-log">
      <p className="pg-label">Requests</p>
      {entries.length === 0 ? (
        <p className="pg-log-empty">None yet.</p>
      ) : (
        <ul>
          {entries.map((entry) => (
            <li key={entry.id} data-status={entry.status}>
              <span className="pg-log-call">{entry.label}</span>
              <span>{describe(entry)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function describe(entry: LogEntry) {
  if (entry.status === "pending") return "pending…"
  const seconds = `${(entry.ms / 1000).toFixed(1)}s`
  return entry.status === "failed" ? `failed, ${seconds}` : seconds
}

// react-live renders a contenteditable <pre> without a name. Give it one,
// and expose it as a multi-line text box.
function useEditorSemantics(
  ref: RefObject<HTMLElement | null>,
  label: string,
  version: number
) {
  useEffect(() => {
    const pre = ref.current?.querySelector("pre")
    if (!pre) return
    pre.setAttribute("role", "textbox")
    pre.setAttribute("aria-multiline", "true")
    pre.setAttribute("aria-label", label)
  }, [ref, label, version])
}

// Browsers with focusgroup give the toolbar one tab stop and arrow-key
// movement natively. Elsewhere, do the same with a roving tabindex.
function useRovingFocusFallback(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const bar = ref.current
    if (!bar || "focusGroup" in HTMLElement.prototype) return

    const items = () => Array.from(bar.querySelectorAll("button"))
    items().forEach((item, index) => (item.tabIndex = index ? -1 : 0))

    const onFocusIn = (event: FocusEvent) => {
      const list = items()
      if (!list.includes(event.target as HTMLButtonElement)) return
      list.forEach((item) => (item.tabIndex = item === event.target ? 0 : -1))
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const list = items()
      const index = list.indexOf(document.activeElement as HTMLButtonElement)
      if (index === -1) return
      const rtl = getComputedStyle(bar).direction === "rtl"
      const steps: Record<string, number> = {
        ArrowRight: rtl ? -1 : 1,
        ArrowLeft: rtl ? 1 : -1,
      }
      let next: number
      if (event.key in steps) {
        next = (index + steps[event.key] + list.length) % list.length
      } else if (event.key === "Home") {
        next = 0
      } else if (event.key === "End") {
        next = list.length - 1
      } else {
        return
      }
      event.preventDefault()
      list[next].focus()
    }

    bar.addEventListener("focusin", onFocusIn)
    bar.addEventListener("keydown", onKeyDown)
    return () => {
      bar.removeEventListener("focusin", onFocusIn)
      bar.removeEventListener("keydown", onKeyDown)
    }
  }, [ref])
}
