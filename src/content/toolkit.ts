import {
  Atom,
  Boxes,
  Braces,
  CodeXml,
  GitBranch,
  PenTool,
  Sparkles,
  SquareTerminal,
  Type,
  Wind,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { Tone } from "./site"

export type Tool = {
  name: string
  note: string
  icon: LucideIcon
  tone: Tone
}

export const toolkit: Tool[] = [
  {
    name: "VS Code",
    note: "With Vim keybindings",
    icon: CodeXml,
    tone: "blue",
  },
  {
    name: "Windows Terminal",
    note: "With PowerShell",
    icon: SquareTerminal,
    tone: "emerald",
  },
  {
    name: "Geist Mono",
    note: "Editor and terminal font",
    icon: Type,
    tone: "violet",
  },
  { name: "React & Next.js", note: "Daily drivers", icon: Atom, tone: "sky" },
  { name: "TypeScript", note: "Development", icon: Braces, tone: "blue" },
  { name: "Tailwind CSS", note: "Development", icon: Wind, tone: "teal" },
  {
    name: "pnpm + Turborepo",
    note: "Monorepo tooling",
    icon: Boxes,
    tone: "orange",
  },
  {
    name: "Figma",
    note: "Design handoff and prototyping",
    icon: PenTool,
    tone: "pink",
  },
  { name: "GitHub", note: "Apps and services", icon: GitBranch, tone: "gray" },
  {
    name: "Claude Code",
    note: "AI pair programming",
    icon: Sparkles,
    tone: "amber",
  },
]
