import * as core from "nepali-day-picker"
import * as holidays from "nepali-day-picker/holidays"
import * as picker from "nepali-day-picker/react"
import * as button from "@/components/ui/button"
import * as calendar from "@/components/ui/calendar"
import * as popover from "@/components/ui/popover"

// Extra modules for playgrounds that use nepali-day-picker with shadcn/ui.
// The playground loads this chunk only when an example imports one of them,
// so the other posts' playgrounds don't download a calendar.
export const modules: Record<string, object> = {
  "nepali-day-picker": core,
  "nepali-day-picker/holidays": holidays,
  "nepali-day-picker/react": picker,
  "@/components/ui/button": button,
  "@/components/ui/calendar": calendar,
  "@/components/ui/popover": popover,
}
