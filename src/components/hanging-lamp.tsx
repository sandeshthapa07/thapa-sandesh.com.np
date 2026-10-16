import { useEffect, useRef, useState } from "react"
import type { PointerEvent } from "react"
import { centerOf, toggleTheme } from "@/lib/theme"
import { cn } from "@/lib/utils"

// Pendulum tuning: GRAVITY is g / length (about a 1.6s swing), DAMPING how
// quickly it settles. Angles are radians, positive swings to the right.
const GRAVITY = 15
const DAMPING = 1.6
const MAX_ANGLE = 1.1
const MAX_SPEED = 6
// A drag counts once the pointer moves this far (px); shorter is a click.
const DRAG_SLOP = 6
// How far the cord stretches, and how far it must be pulled to click.
const PULL_MAX = 44
const PULL_TRIGGER = 16

const clamp = (value: number, limit: number) =>
  Math.max(-limit, Math.min(limit, value))

const reducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches

/**
 * A pendant lamp beside the hero photo. Pull its cord to switch the bulb on
 * and off; swing the bulb to switch the site theme.
 */
export function HangingLamp() {
  const [lit, setLit] = useState(false)
  const [pulled, setPulled] = useState(false)
  const [pulling, setPulling] = useState(false)

  const pivotRef = useRef<HTMLDivElement>(null)
  const swingRef = useRef<HTMLDivElement>(null)
  const bulbRef = useRef<HTMLButtonElement>(null)
  const cordRef = useRef<HTMLDivElement>(null)
  const sim = useRef({ angle: 0, velocity: 0, frame: 0, last: 0 })
  const bulbDrag = useRef({ active: false, moved: false, x: 0, y: 0 })
  const bulbGrab = useRef({ angle: 0, pointer: 0, time: 0 })
  const cordDrag = useRef({ active: false, moved: false, y: 0, pull: 0 })

  useEffect(() => {
    const state = sim.current
    return () => cancelAnimationFrame(state.frame)
  }, [])

  function draw(angle: number) {
    swingRef.current?.style.setProperty("transform", `rotate(${-angle}rad)`)
  }

  function stop() {
    cancelAnimationFrame(sim.current.frame)
    sim.current.frame = 0
  }

  function tick(time: number) {
    const state = sim.current
    const dt = Math.min((time - state.last) / 1000, 1 / 30)
    state.last = time
    state.velocity +=
      (-GRAVITY * Math.sin(state.angle) - DAMPING * state.velocity) * dt
    state.angle += state.velocity * dt
    if (Math.abs(state.angle) < 2e-3 && Math.abs(state.velocity) < 1e-2) {
      state.angle = 0
      state.velocity = 0
      state.frame = 0
      draw(0)
      return
    }
    draw(state.angle)
    state.frame = requestAnimationFrame(tick)
  }

  /** Lets the lamp swing freely, optionally after a push. */
  function swing(push = 0) {
    const state = sim.current
    state.velocity = clamp(state.velocity + push, MAX_SPEED)
    if (reducedMotion()) {
      state.angle = 0
      state.velocity = 0
      draw(0)
      return
    }
    if (!state.frame) {
      state.last = performance.now()
      state.frame = requestAnimationFrame(tick)
    }
  }

  /** Pointer angle around the pivot, measured from straight down. */
  function angleTo(event: PointerEvent) {
    const rect = pivotRef.current!.getBoundingClientRect()
    return Math.atan2(
      event.clientX - (rect.left + rect.width / 2),
      event.clientY - rect.top
    )
  }

  function switchTheme() {
    toggleTheme(bulbRef.current ? centerOf(bulbRef.current) : undefined)
  }

  function onBulbDown(event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    stop()
    bulbDrag.current = {
      active: true,
      moved: false,
      x: event.clientX,
      y: event.clientY,
    }
    bulbGrab.current = {
      angle: sim.current.angle,
      pointer: angleTo(event),
      time: event.timeStamp,
    }
    sim.current.velocity = 0
  }

  function onBulbMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = bulbDrag.current
    if (!drag.active) return
    const distance = Math.hypot(event.clientX - drag.x, event.clientY - drag.y)
    if (!drag.moved && distance < DRAG_SLOP) return
    drag.moved = true

    const grab = bulbGrab.current
    const state = sim.current
    const angle = clamp(grab.angle + angleTo(event) - grab.pointer, MAX_ANGLE)
    const dt = (event.timeStamp - grab.time) / 1000
    if (dt > 0) {
      // Smoothed so a flick carries into the swing on release.
      state.velocity = 0.6 * state.velocity + (0.4 * (angle - state.angle)) / dt
      grab.time = event.timeStamp
    }
    state.angle = angle
    draw(angle)
  }

  function onBulbUp() {
    const drag = bulbDrag.current
    if (!drag.active) return
    drag.active = false
    if (!drag.moved) return // a plain click; onClick handles it
    swing()
    switchTheme()
  }

  function onBulbCancel() {
    bulbDrag.current.active = false
    swing()
  }

  function onBulbClick() {
    // Clicks after a drag were already handled on release.
    if (bulbDrag.current.moved) {
      bulbDrag.current.moved = false
      return
    }
    swing(2.4)
    switchTheme()
  }

  /** Stretches the cord; `pull` is in screen pixels, before the lamp's scale. */
  function setPull(pull: number) {
    const style = pivotRef.current && getComputedStyle(pivotRef.current)
    const scale = Number(style?.getPropertyValue("--scale")) || 1
    cordRef.current?.style.setProperty("--pull", `${pull / scale}px`)
  }

  function flipLight() {
    setLit((on) => !on)
    setPulled(true)
    swing(0.5)
  }

  function onCordDown(event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    cordDrag.current = { active: true, moved: false, y: event.clientY, pull: 0 }
    setPulling(true)
  }

  function onCordMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = cordDrag.current
    if (!drag.active) return
    drag.pull = Math.max(0, Math.min(PULL_MAX, event.clientY - drag.y))
    if (drag.pull > 3) drag.moved = true
    setPull(drag.pull)
  }

  function onCordUp() {
    const drag = cordDrag.current
    if (!drag.active) return
    drag.active = false
    setPulling(false)
    setPull(0)
    if (drag.pull >= PULL_TRIGGER) flipLight()
  }

  function onCordClick() {
    if (cordDrag.current.moved) {
      cordDrag.current.moved = false
      return
    }
    // Keyboard or a tap: play a short tug.
    setPull(PULL_TRIGGER + 4)
    setTimeout(() => setPull(0), 140)
    flipLight()
  }

  return (
    <div
      ref={pivotRef}
      className="relative -mt-8 w-14 shrink-0 self-stretch [--cord:44px] [--scale:1] [--wire:72px] sm:-mt-16 sm:[--wire:96px] lg:w-16 lg:[--cord:56px] lg:[--scale:1.25] lg:[--wire:120px]"
    >
      <span
        aria-hidden
        className="absolute top-0 left-1/2 h-1.5 w-7 -translate-x-1/2 rounded-b-md bg-line-strong"
      />
      <div ref={swingRef} className="absolute top-0 left-1/2 w-0 origin-top">
        <div className="origin-top scale-(--scale)">
          <span
            aria-hidden
            className="absolute top-0 left-0 h-(--wire) w-px -translate-x-1/2 bg-fg-3"
          />

          <button
            ref={bulbRef}
            type="button"
            aria-label="Toggle light and dark theme"
            title="Swing me to switch the theme"
            onPointerDown={onBulbDown}
            onPointerMove={onBulbMove}
            onPointerUp={onBulbUp}
            onPointerCancel={onBulbCancel}
            onClick={onBulbClick}
            className="absolute top-(--wire) left-0 -translate-x-1/2 cursor-grab touch-none rounded-full outline-none select-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
          >
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute top-[37px] left-1/2 size-3 -translate-1/2 rounded-full shadow-[0_0_36px_22px_rgb(253_224_71/0.5),0_0_140px_90px_rgb(253_224_71/0.16)] transition-opacity duration-500",
                lit ? "animate-flicker-on opacity-100" : "opacity-0"
              )}
            />
            <svg
              aria-hidden
              viewBox="0 0 48 56"
              width="48"
              height="56"
              className="relative block"
            >
              <path
                d="M31 7h9.5"
                fill="none"
                stroke="var(--fg-3)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle
                cx="43"
                cy="7"
                r="2.5"
                fill="none"
                stroke="var(--fg-3)"
                strokeWidth="1.5"
              />
              <path
                d="M18 13h12c0 6 10 10 10 24a16 16 0 1 1-32 0c0-14 10-18 10-24Z"
                strokeWidth="1.25"
                className={cn(
                  "transition-[fill,stroke] duration-300",
                  lit
                    ? "fill-[#fef08a] stroke-[#facc15]"
                    : "fill-[color-mix(in_srgb,var(--foreground)_6%,transparent)] stroke-spoke"
                )}
              />
              <path
                d="M21 14v12M27 14v12M21 26c1-2.5 2-2.5 3 0s2 2.5 3 0"
                fill="none"
                strokeWidth="1.25"
                strokeLinecap="round"
                className={cn(
                  "transition-[stroke] duration-300",
                  lit ? "stroke-[#f59e0b]" : "stroke-fg-3"
                )}
              />
              <rect
                x="17"
                y="0"
                width="14"
                height="14"
                rx="2"
                fill="var(--fg-3)"
              />
              <path
                d="M17 5h14M17 9h14"
                stroke="var(--background)"
                strokeOpacity="0.45"
              />
            </svg>
          </button>

          <div
            ref={cordRef}
            className="absolute top-[calc(var(--wire)+9.5px)] left-[19px] [--pull:0px]"
          >
            <span
              aria-hidden
              className={cn(
                "absolute top-0 left-0 block h-[calc(var(--cord)+var(--pull))] w-px -translate-x-1/2 bg-fg-3",
                !pulling && "transition-[height] duration-500 ease-out-back"
              )}
            />
            <button
              type="button"
              aria-label="Lamp"
              aria-pressed={lit}
              title="Pull me"
              onPointerDown={onCordDown}
              onPointerMove={onCordMove}
              onPointerUp={onCordUp}
              onPointerCancel={onCordUp}
              onClick={onCordClick}
              className={cn(
                "absolute top-[calc(var(--cord)+var(--pull))] left-0 grid size-7 -translate-x-1/2 -translate-y-1 cursor-grab touch-none place-items-start justify-center rounded-full outline-none select-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing",
                !pulling && "transition-[top] duration-500 ease-out-back"
              )}
            >
              <span className="mt-1 h-3.5 w-2.5 rounded-full bg-yellow shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)]" />
            </button>
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute top-[calc(var(--cord)+var(--pull)+22px)] left-0 -translate-x-1/2 font-mono text-[10px] whitespace-nowrap text-fg-3 transition-opacity duration-500",
                pulled && "opacity-0"
              )}
            >
              pull
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
