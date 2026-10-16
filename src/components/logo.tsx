import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden
      className={cn("size-10 shrink-0", className)}
    >
      <rect width="40" height="40" rx="12" fill="var(--yellow)" />
      <path
        d="M26 13.5c-1.2-1.6-3.3-2.5-5.8-2.5-3.6 0-6 1.9-6 4.6 0 6 12.1 3.2 12.1 9.1 0 2.8-2.6 4.8-6.4 4.8-2.8 0-5.1-1-6.4-2.9"
        fill="none"
        stroke="#111"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  )
}
