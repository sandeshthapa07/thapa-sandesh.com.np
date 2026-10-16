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
    href: "https://mercury360.io/",
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
