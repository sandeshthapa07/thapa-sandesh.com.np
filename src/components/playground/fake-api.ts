// The `./api` module that playground code imports. Every call waits for a
// delay set by the playground's Network control, can be made to fail, and is
// recorded in a small log so readers can watch requests race.

export const NETWORKS = ["fast", "slow", "random"] as const
export type Network = (typeof NETWORKS)[number]

export function toNetwork(value: string | undefined): Network {
  return NETWORKS.find((network) => network === value) ?? "fast"
}

/** `network="none"` on a fence: the example makes no requests. */
export function usesNetwork(value: string | undefined) {
  return value !== "none"
}

export type Settings = { network: Network; fail: boolean }

export type LogEntry = {
  id: number
  label: string
  status: "pending" | "done" | "failed"
  ms: number
}

const POSTS = [
  "Async React: let React handle the waiting",
  "Actions and useTransition",
  "Optimistic updates with useOptimistic",
  "Reading data with use and Suspense",
  "Forms with useActionState",
  "Animating with ViewTransition",
  "Deferring work with useDeferredValue",
  "Race conditions in useEffect",
  "Error boundaries in practice",
  "Caching promises for Suspense",
  "WebMCP: give AI agents tools, not screenshots",
  "Choosing a frontend stack",
].map((title) => ({
  slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  title,
}))

// The posts that really are on this site.
const LATEST_POSTS = [POSTS[0], POSTS[10], POSTS[11]]

function delayFor(network: Network) {
  if (network === "fast") return 100
  if (network === "slow") return 1500
  return 100 + Math.round(Math.random() * 1900)
}

export function createRequestLog(limit = 6) {
  let entries: ReadonlyArray<LogEntry> = []
  let nextId = 1
  let queued = false
  const listeners = new Set<() => void>()

  // Requests can start while React renders (use() with a cache), and React
  // doesn't allow updating another component mid-render, so tell listeners
  // after the current task.
  function emit() {
    if (queued) return
    queued = true
    setTimeout(() => {
      queued = false
      listeners.forEach((listener) => listener())
    })
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getSnapshot: () => entries,
    start(label: string, ms: number) {
      const entry: LogEntry = { id: nextId++, label, status: "pending", ms }
      entries = [...entries, entry].slice(-limit)
      emit()
      return entry.id
    },
    settle(id: number, status: LogEntry["status"]) {
      entries = entries.map((entry) =>
        entry.id === id ? { ...entry, status } : entry
      )
      emit()
    },
    clear() {
      entries = []
      emit()
    },
  }
}

export type RequestLog = ReturnType<typeof createRequestLog>

export function createFakeApi(getSettings: () => Settings, log: RequestLog) {
  let nextMessageId = 1

  // `weight` makes some calls quicker or slower than the network's base
  // delay, so a page can have a fast request and a slow one.
  function request<T>(label: string, result: () => T, weight = 1) {
    const { network, fail } = getSettings()
    const ms = Math.round(delayFor(network) * weight)
    const id = log.start(label, ms)
    return new Promise<T>((resolve, reject) => {
      setTimeout(() => {
        if (fail) {
          log.settle(id, "failed")
          reject(new Error(`${label} failed`))
        } else {
          log.settle(id, "done")
          resolve(result())
        }
      }, ms)
    })
  }

  const show = (value: unknown) => JSON.stringify(value)

  return {
    searchPosts: (query: string) =>
      request(`searchPosts(${show(query)})`, () =>
        POSTS.filter((post) =>
          post.title.toLowerCase().includes(query.trim().toLowerCase())
        )
      ),
    publishPost: (id: string) =>
      request(`publishPost(${show(id)})`, () => undefined),
    updateName: (name: string) =>
      request(`updateName(${show(name)})`, () => name.trim()),
    saveBookmark: (id: string, saved: boolean) =>
      request(`saveBookmark(${show(id)}, ${saved})`, () => saved),
    sendMessage: (text: string) =>
      request(`sendMessage(${show(text)})`, () => ({
        id: nextMessageId++,
        text,
      })),
    getProfile: () =>
      request(
        "getProfile()",
        () => ({ name: "Sandesh Thapa", role: "Frontend developer" }),
        0.3
      ),
    getPosts: () => request("getPosts()", () => LATEST_POSTS, 2),
    // `key` is an idempotency key: shown in the log so readers can see
    // every retry of one checkout carries the same one.
    placeOrder: (amount: number, key?: string) =>
      request(
        key ? `placeOrder(${amount}, ${show(key)})` : `placeOrder(${amount})`,
        () => ({ amount })
      ),
  }
}
