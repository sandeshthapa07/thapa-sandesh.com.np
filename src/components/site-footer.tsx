import { usePostHog } from "@posthog/react"
import { Link } from "@tanstack/react-router"
import { site } from "@/content/site"

export function SiteFooter() {
  const posthog = usePostHog()

  return (
    <footer className="mt-5 flex flex-col items-center justify-between gap-4 border-t border-line px-6 py-8 text-sm text-fg-3 sm:flex-row">
      <p>
        © {new Date().getFullYear()} {site.name} · Based in {site.location}
      </p>
      <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        <Link to="/writing" className="transition-colors hover:text-foreground">
          Writing
        </Link>
        {site.socials.map((social) => (
          <a
            key={social.label}
            href={social.href}
            onClick={() => {
              if (social.label === "Email") {
                posthog.capture("contact_initiated", { placement: "footer" })
                return
              }

              posthog.capture("social_profile_visited", {
                platform: social.label.toLowerCase(),
                placement: "footer",
              })
            }}
            className="transition-colors hover:text-foreground"
            {...(social.href.startsWith("http") && {
              target: "_blank",
              rel: "noreferrer",
            })}
          >
            {social.label}
          </a>
        ))}
      </nav>
    </footer>
  )
}
