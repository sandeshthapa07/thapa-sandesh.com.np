export type Project = {
  title: string
  description: string
  href: string
  /** Square logo in public/projects. */
  logo: string
  badge?: string
  tags: string[]
}

export const projects: Project[] = [
  {
    title: "Kuver Books",
    description:
      "Billing, POS and inventory for businesses in Nepal, with IRD-ready VAT invoicing and stock synced across branches.",
    href: "https://kuverbooks.com/",
    logo: "/projects/kuver-books.svg",
    badge: "SaaS",
    tags: ["Billing", "POS", "Inventory"],
  },
  {
    title: "Mercury360",
    description:
      "Mercury Recruit, an applicant tracking system with AI résumé parsing, candidate ranking and custom hiring pipelines.",
    href: "https://mercury360.com/",
    logo: "/projects/mercury360.svg",
    badge: "SaaS",
    tags: ["Recruiting", "ATS", "AI"],
  },
  {
    title: "Annapurna Art",
    description:
      "Marketplace for buying and selling original artwork, with artist profiles, curated collections and online exhibitions.",
    href: "https://annapurnaart.com/",
    logo: "/projects/annapurna-art.png",
    tags: ["Marketplace", "E-commerce"],
  },
  {
    title: "Eureka Traders",
    description:
      "Online store for handmade felt goods made by Nepali women artisans, with wholesale and custom orders.",
    href: "https://eurekatraders.org/",
    logo: "/projects/eureka-traders.png",
    tags: ["E-commerce", "Wholesale"],
  },
]

/** Things built on my own time: a product of my own and open-source packages. */
export type SideProject = {
  title: string
  kind: "Side project" | "npm package"
  /** What it is, in one sentence. */
  summary: string
  /** The problem it solves, and why I made it. */
  why: string
  href: string
  /** Source code, when it's public. */
  source?: string
  /** Slug of a post about how it was built, under /writing. */
  post?: string
  /** A 16:10 screenshot in public/projects, 1360×850. */
  image: { src: string; alt: string }
  tags: string[]
}

export const sideProjects: SideProject[] = [
  {
    title: "Sandesh",
    kind: "Side project",
    summary:
      "Write a letter in English or नेपाली, sign it by hand, seal it with wax and send it as a private link. Sandesh (सन्देश) means “message”, and it's my name too.",
    why: "A text in a chat app scrolls away by the next morning, and writing Nepali online usually means a Nepali keyboard or pasting from a converter. Sandesh feels more like paper: type “maayaa” and it becomes माया, draw your signature, and the person you love taps the wax seal to open it. No app or sign-up to read it, and the letter lives inside the link instead of on a server.",
    href: "https://sandesh.site/",
    image: {
      src: "/projects/sandesh-site.webp",
      alt: "The sandesh.site home page: “Say it on paper.” beside a kraft envelope addressed to Aama in Pokhara, with a wax-seal logo and a Write a letter button.",
    },
    tags: ["Letters", "Nepali typing", "Web app"],
  },
  {
    title: "nepali-day-picker",
    kind: "npm package",
    summary:
      "Bikram Sambat ↔ AD conversion, formatting, parsing, fiscal years and public holidays, plus a BS calendar for react-day-picker and shadcn/ui.",
    why: "Invoices, payslips and government forms in Nepal are dated in Bikram Sambat, but JavaScript and the date pickers we all use only know AD. The converters in apps I'd worked on disagreed about future years, so I compared five data tables and wrote my own. Your data stays plain Dates, years the calendar committee hasn't published throw instead of guessing, and shadcn's Calendar becomes a BS calendar with one import.",
    href: "https://npmx.dev/package/nepali-day-picker",
    source: "https://github.com/sandeshthapa07/nepali-day-picker",
    post: "nepali-date-picker-shadcn-ui",
    image: {
      src: "/projects/nepali-day-picker.webp",
      alt: "Two calendars from nepali-day-picker: Mangsir 2083 in Nepali with AD dates under each day, and November 2026 with BS dates under each day. Saturdays and public holidays are red.",
    },
    tags: ["Bikram Sambat", "React", "shadcn/ui"],
  },
  {
    title: "@sandeshthapa07/nepal-utils",
    kind: "npm package",
    summary:
      "NPR formatting with lakh and crore grouping, amounts in words in English and Nepali, Devanagari digits, and validators for Nepali phone numbers, PAN and postal codes.",
    why: "Every Nepali app ends up writing these helpers: Intl groups rupees the Western way (1,234,567, not 12,34,567), invoices need the amount in words, and forms have to accept a number typed as +977-984… or in Devanagari digits. I put them in one small, tested package with no dependencies, so they're written once.",
    href: "https://npmx.dev/package/@sandeshthapa07/nepal-utils",
    source: "https://github.com/sandeshthapa07/nepal-utils",
    image: {
      src: "/projects/nepal-utils.webp",
      alt: "Calls to nepal-utils and their results: Rs. 12,34,567.50, the same amount in Devanagari digits, 15 lakh, an amount in words in English and in Nepali, a Nepal Telecom mobile number and a valid PAN.",
    },
    tags: ["NPR", "Validators", "TypeScript"],
  },
]
