import { Link } from "@tanstack/react-router"

export function NotFound() {
  return (
    <div className="px-5 py-24 text-center sm:py-32">
      <p className="font-mono text-[11px] tracking-[0.16em] text-yellow-text uppercase">
        404
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-[34px]">
        This page doesn&apos;t exist
      </h1>
      <p className="mt-3 text-sm text-fg-3">
        It may have moved, or the link is wrong.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex text-sm text-fg-2 underline decoration-line-strong underline-offset-4 hover:text-foreground"
      >
        Back home
      </Link>
    </div>
  )
}
