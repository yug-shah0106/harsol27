"use client"

import * as React from "react"
import { cn } from "cn"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

export type DropdownOption = { value: string; label: string }

type DropdownProps = {
  /** Also the target of the field's <label htmlFor>, which names the dropdown. */
  id: string
  /** Form field name: the value is submitted through a hidden input. */
  name?: string
  options: readonly DropdownOption[]
  defaultValue?: string
  /** Controlled use (optional); otherwise the dropdown keeps its own value. */
  value?: string
  onValueChange?: (value: string) => void
  /** Shown while no option is chosen, e.g. "Choose an industry". Not an option itself. */
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}

const PAGE = 10 // options moved by Page Up / Page Down
const LIST_MAX_HEIGHT = 288 // px, matches max-h-72
const TYPEAHEAD_MS = 600

/**
 * Harsol27's dropdown, used for every choice-from-a-list on the site. Our look in every browser,
 * and it behaves like a native select (the WAI-ARIA "select-only combobox" pattern):
 * - mouse: click to open, click an option, click outside to close
 * - keyboard: ↓ ↑ Home End PageUp PageDown move; Enter or Space choose; Escape closes unchanged;
 *   Tab chooses and moves on; typing letters jumps to a matching option ("gu" → Gujarat)
 * - screen readers: the label names it, the chosen value and the highlighted option are announced
 * - forms: a hidden input carries the value, so GET filters, server actions and form reset work
 * Focus stays on the button while the list is open (aria-activedescendant). No inline styles (CSP).
 */
function Dropdown({
  id,
  name,
  options,
  defaultValue,
  value: controlled,
  onValueChange,
  placeholder,
  required,
  disabled,
  className,
  "aria-invalid": invalid,
  "aria-describedby": describedBy,
}: DropdownProps) {
  const [own, setOwn] = React.useState(defaultValue ?? "")
  const value = controlled ?? own
  const [open, setOpen] = React.useState(false)
  const [active, setActive] = React.useState(-1)
  const [above, setAbove] = React.useState(false)
  const wrapper = React.useRef<HTMLDivElement>(null)
  const button = React.useRef<HTMLButtonElement>(null)
  const list = React.useRef<HTMLDivElement>(null)
  const typed = React.useRef({ text: "", at: 0 })

  const listId = `${id}-listbox`
  const optionId = (index: number) => `${id}-option-${index}`
  const selectedIndex = options.findIndex((o) => o.value === value)
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined

  // The list is named by the same <label> that names the button (aria-labelledby needs its id).
  React.useEffect(() => {
    const label = document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(id)}"]`)
    if (!label) return
    label.id ||= `${id}-label`
    list.current?.setAttribute("aria-labelledby", label.id)
  }, [id])

  // Form reset (including React's reset after a successful action) restores the starting value.
  React.useEffect(() => {
    const form = wrapper.current?.closest("form")
    if (!form || controlled !== undefined) return
    const reset = () => setOwn(defaultValue ?? "")
    form.addEventListener("reset", reset)
    return () => form.removeEventListener("reset", reset)
  }, [controlled, defaultValue])

  // Close when clicking anywhere else.
  React.useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", outside)
    return () => document.removeEventListener("pointerdown", outside)
  }, [open])

  // Keep the highlighted option in view while moving through a long list.
  React.useEffect(() => {
    if (open && active >= 0) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: "nearest" })
  }, [open, active, id])

  function show(highlight: number) {
    const rect = button.current?.getBoundingClientRect()
    if (rect) {
      const needed = Math.min(LIST_MAX_HEIGHT, options.length * 40 + 10)
      const below = window.innerHeight - rect.bottom
      setAbove(below < needed && rect.top > below) // open upwards when there is more room there
    }
    setActive(highlight)
    setOpen(true)
  }

  function choose(index: number) {
    const option = options[index]
    setOpen(false)
    if (!option) return
    if (controlled === undefined) setOwn(option.value)
    if (option.value !== value) onValueChange?.(option.value)
  }

  /**
   * Type-ahead: the option whose label starts with what was typed in the last moment. One letter
   * (or the same letter again) moves to the next match, so "g g g" cycles through the G's; a longer
   * run like "gu" keeps refining from the current option.
   */
  function match(key: string, from: number): number {
    const now = Date.now()
    const text = (now - typed.current.at > TYPEAHEAD_MS ? "" : typed.current.text) + key
    typed.current = { text, at: now }
    const repeated = [...text].every((c) => c === text[0])
    const search = (repeated ? key : text).toLowerCase()
    const offset = repeated ? 1 : 0
    for (let step = 0; step < options.length; step++) {
      const index = (from + offset + step) % options.length
      if (options[index]?.label.toLowerCase().startsWith(search)) return index
    }
    return -1
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    const last = options.length - 1
    const start = selectedIndex >= 0 ? selectedIndex : 0
    const printable = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey

    if (!open) {
      const opens: Record<string, number | undefined> = {
        ArrowDown: start,
        ArrowUp: start,
        Enter: start,
        " ": start,
        Home: 0,
        End: last,
      }
      if (event.key in opens) {
        event.preventDefault()
        show(opens[event.key]!)
      } else if (printable) {
        event.preventDefault()
        const found = match(event.key, start)
        show(found >= 0 ? found : start)
      }
      return
    }

    const moves: Record<string, number | undefined> = {
      ArrowDown: Math.min(active + 1, last),
      ArrowUp: Math.max(active - 1, 0),
      Home: 0,
      End: last,
      PageDown: Math.min(active + PAGE, last),
      PageUp: Math.max(active - PAGE, 0),
    }
    if (event.key === "ArrowUp" && event.altKey) {
      event.preventDefault()
      choose(active)
    } else if (event.key in moves) {
      event.preventDefault()
      setActive(moves[event.key]!)
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      choose(active)
    } else if (event.key === "Escape") {
      event.preventDefault()
      setOpen(false)
    } else if (event.key === "Tab") {
      choose(active) // and let focus move on
    } else if (printable) {
      event.preventDefault()
      const found = match(event.key, active)
      if (found >= 0) setActive(found)
    }
  }

  return (
    <div ref={wrapper} data-slot="dropdown" className={cn("relative w-fit", className)}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        ref={button}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show(selectedIndex >= 0 ? selectedIndex : 0))}
        onKeyDown={onKeyDown}
        onBlur={() => setOpen(false)}
        className="flex h-10 w-full min-w-0 items-center rounded-lg border border-input bg-card py-1 pr-9 pl-3 text-left text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm"
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>{selected?.label ?? placeholder ?? ""}</span>
        <ChevronDownIcon
          aria-hidden="true"
          className={cn("pointer-events-none absolute right-3 size-4 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      <ScrollArea
        ref={list}
        id={listId}
        role="listbox"
        tabIndex={-1}
        hidden={!open}
        data-side={above ? "top" : "bottom"}
        // Keep focus on the button when an option is clicked.
        onMouseDown={(event) => event.preventDefault()}
        className="absolute inset-x-0 z-50 max-h-72 min-w-40 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg [--scroll-bg:var(--popover)] data-[side=bottom]:top-full data-[side=bottom]:mt-1 data-[side=top]:bottom-full data-[side=top]:mb-1"
      >
        {options.map((option, index) => (
          <div
            key={option.value}
            id={optionId(index)}
            role="option"
            aria-selected={option.value === value}
            data-active={index === active || undefined}
            onClick={() => choose(index)}
            onPointerMove={() => setActive(index)}
            className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm aria-selected:font-semibold data-active:bg-secondary"
          >
            <span>{option.label}</span>
            {option.value === value && <CheckIcon aria-hidden="true" className="size-4 shrink-0 text-primary" />}
          </div>
        ))}
      </ScrollArea>
    </div>
  )
}

export { Dropdown }
