import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"
import { NotFound } from "@/components/not-found"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { site } from "@/content/site"

import appCss from "../styles.css?url"

// Runs before paint so a saved theme override never flashes the other theme
// first (see lib/theme.ts). It creates the color-scheme <meta> itself because
// React matches <meta> tags by `content` while hydrating: editing one React
// rendered would make React append a duplicate.
const colorSchemeScript = `(function(){var m=document.createElement("meta");m.name="color-scheme";m.content="light dark";try{var s=localStorage.getItem("theme");if(s==="light"||s==="dark")m.content=s}catch(e){}document.head.appendChild(m)})()`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: site.title },
      { name: "description", content: site.description },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.json" },
    ],
  }),
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: colorSchemeScript }} />
        {/* Rendered here, not in `head()`: the router keeps one meta per name. */}
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content="#ffffff"
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content="#0e0e10"
        />
        <HeadContent />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only rounded-full bg-yellow px-4 py-2 text-sm font-medium text-[#111] focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
        >
          Skip to content
        </a>
        <div className="mx-auto max-w-[1160px] px-3 sm:px-4">
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
        </div>
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
