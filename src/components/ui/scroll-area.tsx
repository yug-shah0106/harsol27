import * as React from "react"
import { cn } from "cn"

type ScrollAreaProps = React.ComponentProps<"div"> & {
  /** Which way the content scrolls. Default: vertical. */
  orientation?: "horizontal" | "vertical" | "both"
  /**
   * Names the area for screen readers and lets keyboard users Tab to it and scroll it with the
   * arrow keys. Needed when nothing inside can take focus (for example a table of plain text).
   */
  label?: string
}

const OVERFLOW = {
  horizontal: "overflow-x-auto overflow-y-hidden",
  vertical: "overflow-y-auto overflow-x-hidden",
  both: "overflow-auto",
} as const

/**
 * Harsol27's scroll container: use it for anything that scrolls inside a page. The browser does the
 * scrolling (keyboard, touch, trackpad and screen readers work as usual); we only change the look:
 * our thin brand scrollbar, and soft edge shadows while there is more to see (globals.css,
 * ".scroll-area"). Pure CSS, so it needs no JavaScript and works under the strict CSP.
 *
 * Set `--scroll-bg` to the background behind it when that is not the page's, e.g.
 * className="[--scroll-bg:var(--card)]" inside a card.
 */
function ScrollArea({ orientation = "vertical", label, className, children, ...props }: ScrollAreaProps) {
  return (
    <div
      data-slot="scroll-area"
      data-orientation={orientation}
      className={cn("scroll-area", OVERFLOW[orientation], className)}
      {...(label ? { role: "region", "aria-label": label, tabIndex: 0 } : {})}
      {...(orientation !== "horizontal" ? { "data-lenis-prevent": "" } : {})}
      {...props}
    >
      {children}
    </div>
  )
}

export { ScrollArea }
