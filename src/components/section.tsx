import { cn } from "@/lib/utils"

/** Vertical breathing room between sections. */
export function Band() {
  return <div aria-hidden className="h-5" />
}

export function SectionTitle({
  id,
  kicker,
  title,
  subtitle,
  as: Heading = "h2",
  className,
}: {
  id?: string
  kicker: string
  title: string
  subtitle?: string
  as?: "h1" | "h2"
  className?: string
}) {
  return (
    <div className={cn("px-5 pt-12 pb-8 text-center", className)}>
      <p className="mb-3 font-mono text-[11px] tracking-[0.16em] text-yellow-text uppercase">
        {kicker}
      </p>
      <Heading
        id={id}
        className="mb-2 text-xl font-semibold tracking-tight text-balance sm:text-2xl"
      >
        {title}
      </Heading>
      {subtitle && <p className="text-sm text-fg-3">{subtitle}</p>}
    </div>
  )
}
