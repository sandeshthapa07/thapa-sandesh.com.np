import { Link } from "@tanstack/react-router"
import { ArrowUpRight, Menu, Moon, Sun, X } from "lucide-react"
import { Dialog } from "radix-ui"
import { Logo } from "@/components/logo"
import { site } from "@/content/site"
import { centerOf, toggleTheme } from "@/lib/theme"
import { cn } from "@/lib/utils"

const brand =
  "flex items-center gap-2.5 rounded-lg text-sm font-medium whitespace-nowrap outline-offset-4"

const iconButton =
  "grid size-10 place-items-center rounded-full text-fg-2 transition-colors hover:bg-panel hover:text-foreground sm:size-9"

export function SiteHeader() {
  return (
    <header className="flex h-16 items-center justify-between gap-4 px-3 sm:px-6">
      <Link to="/" className={brand}>
        <Logo className="size-7 rounded-lg" />
        {site.name}
      </Link>
      <div className="flex items-center gap-1">
        <nav
          aria-label="Main"
          className="hidden items-center gap-1 text-sm sm:flex"
        >
          <Link
            to="/writing"
            className="rounded-full px-3 py-1.5 text-fg-2 transition-colors hover:text-foreground data-[status=active]:text-foreground"
          >
            Writing
          </Link>
          <a
            href={`mailto:${site.email}`}
            className="rounded-full px-3 py-1.5 text-fg-2 transition-colors hover:text-foreground"
          >
            Contact
          </a>
        </nav>
        <ThemeToggle />
        <MobileMenu />
      </div>
    </header>
  )
}

function ThemeToggle() {
  return (
    <button
      type="button"
      onClick={(event) => toggleTheme(centerOf(event.currentTarget))}
      aria-label="Toggle light and dark theme"
      className={cn(iconButton, "sm:ml-1")}
    >
      <Sun className="hidden size-4 dark:block" />
      <Moon className="size-4 dark:hidden" />
    </button>
  )
}

const menuLink =
  "block py-2.5 text-[28px] font-semibold tracking-tight text-fg-3 transition-colors hover:text-foreground data-[status=active]:text-foreground"

/** Below `sm` the nav folds into a sheet that drops in from the top. */
function MobileMenu() {
  const socials = site.socials.filter((social) => social.label !== "Email")

  return (
    <Dialog.Root>
      <Dialog.Trigger
        aria-label="Open menu"
        className={cn(iconButton, "sm:hidden")}
      >
        <Menu className="size-5" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 sm:hidden" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 top-0 z-50 rounded-b-[18px] border-b border-line bg-background px-6 pb-8 shadow-2xl duration-300 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-4 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-4 sm:hidden"
        >
          <Dialog.Title className="sr-only">Menu</Dialog.Title>
          <div className="flex h-16 items-center justify-between">
            <Dialog.Close asChild>
              <Link to="/" className={brand}>
                <Logo className="size-7 rounded-lg" />
                {site.name}
              </Link>
            </Dialog.Close>
            <Dialog.Close aria-label="Close menu" className={iconButton}>
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <nav aria-label="Main" className="mt-4">
            <ul>
              <li>
                <Dialog.Close asChild>
                  <Link
                    to="/"
                    activeOptions={{ exact: true }}
                    className={menuLink}
                  >
                    Home
                  </Link>
                </Dialog.Close>
              </li>
              <li>
                <Dialog.Close asChild>
                  <Link to="/writing" className={menuLink}>
                    Writing
                  </Link>
                </Dialog.Close>
              </li>
              <li>
                <Dialog.Close asChild>
                  <a href={`mailto:${site.email}`} className={menuLink}>
                    Contact
                  </a>
                </Dialog.Close>
              </li>
            </ul>
          </nav>
          <ul className="mt-6 flex gap-6 border-t border-line pt-6 text-sm">
            {socials.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 py-1 text-fg-2 transition-colors hover:text-foreground"
                >
                  {social.label}
                  <ArrowUpRight className="size-3.5 text-fg-3" />
                </a>
              </li>
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
