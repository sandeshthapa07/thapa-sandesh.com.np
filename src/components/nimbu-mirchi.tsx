/* eslint-disable @typescript-eslint/ban-ts-comment -- the engine is plain JavaScript, as published */
// @ts-nocheck: the physics engine below is plain JavaScript (verlet thread + three.js scene)
// Nimbu mirchi (lemon and chillies), from https://neembu-mirchi-component.vercel.app/code.
// The home page loads it lazily (routes/index.tsx). Changes from the published
// version, all opt-in through new props, so it can hang over the page from a
// full-screen canvas without hiding any part of a swing:
//   - anchorX: where the thread is tied, in pixels from the left (default: centre).
//   - unit: pixels per world unit, so the charm keeps its size on any canvas.
//     The camera then stays in front of the charm with the original lens (a
//     shifted lens covers the rest), so it isn't stretched on a big canvas.
//   - passThrough: the canvas ignores the pointer except over the charm, so
//     the page underneath stays clickable, selectable and scrollable.
//   - The key light (and its shadow) follows the charm, wherever it hangs.
"use client"

import { useEffect, useRef, type ReactNode } from "react"
import * as THREE from "three"
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"
import { cn } from "@/lib/utils"

export interface NimbuMirchiProps {
  className?: string
  children?: ReactNode
  /** Pixels from the top of the component where the thread is tied. Called every frame. Default 0. */
  anchorY?: () => number
  /** Return false to pause rendering (e.g. while hidden). Default: always on. */
  active?: () => boolean
  /** Soft shadow on the wall behind the charm. Default true. */
  shadows?: boolean
  /** Gentle idle sway. Default true. */
  breeze?: boolean
  /** Pixels from the left of the component where the thread is tied. Called every frame. Default: the centre. */
  anchorX?: () => number
  /** Pixels per world unit. Fixes the charm's size whatever the canvas size. Default: fit the height. */
  unit?: number
  /** Let the pointer through to the page, except over the charm. Default false. */
  passThrough?: boolean
}

/**
 * A lemon and green chillies strung on a twisted thread (nimbu mirchi).
 * Drag it, fling it, or sweep the cursor through it. Pull it far and let go: the thread is elastic.
 * Give the wrapper a size and a background; children render on top.
 */
export function NimbuMirchi({
  className,
  children,
  anchorY,
  active,
  shadows = true,
  breeze = true,
  anchorX,
  unit,
  passThrough = false,
}: NimbuMirchiProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Keep the latest callbacks without remounting the scene.
  const anchorRef = useRef(anchorY)
  const anchorXRef = useRef(anchorX)
  const activeRef = useRef(active)
  useEffect(() => {
    anchorRef.current = anchorY
    anchorXRef.current = anchorX
    activeRef.current = active
  })

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return
    const charm = createNimbuMirchi(THREE, RoomEnvironment, {
      container,
      canvas,
      anchorY: () => anchorRef.current?.() ?? 0,
      anchorX: () => anchorXRef.current?.() ?? container.clientWidth / 2,
      active: () => activeRef.current?.() ?? true,
      shadows,
      breeze,
      unit,
      passThrough,
    })
    return () => charm.dispose()
  }, [shadows, breeze, unit, passThrough])

  return (
    <div
      ref={containerRef}
      className={cn("relative touch-pan-y overflow-hidden", className)}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full"
      />
      {children ? (
        <div className="pointer-events-none relative size-full [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
          {children}
        </div>
      ) : null}
    </div>
  )
}

/* ---- Engine: lemon and chillies on a twisted thread, three.js + verlet physics ---- */
function createNimbuMirchi(
  THREE: any,
  RoomEnvironment: any,
  opts: any
): { dispose: () => void } {
  const {
    container,
    canvas = container.querySelector("canvas"),
    anchorY = () => 0,
    anchorX = () => container.clientWidth / 2,
    active = () => true,
    shadows = true,
    breeze = true,
    unit = 0,
    passThrough = false,
  } = opts
  const { Vector3, Quaternion } = THREE
  const smooth = THREE.MathUtils.smoothstep
  const disposables = []
  const track = (x) => (disposables.push(x), x)

  /* ---------------- Renderer, camera, lights ---------------- */
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  })
  renderer.setClearColor(0, 0)
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.shadowMap.enabled = shadows
  renderer.shadowMap.type = THREE.VSMShadowMap

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
  camera.position.set(0, 0, 10)
  const BASE_H =
    2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
  let VIEW_H = BASE_H,
    VIEW_W = BASE_H
  const resize = () => {
    const w = container.clientWidth,
      h = container.clientHeight
    // A full-screen pass-through canvas is mostly empty; 1.5x keeps it light.
    renderer.setPixelRatio(Math.min(devicePixelRatio, passThrough ? 1.5 : 2))
    renderer.setSize(w, h, false)
    if (unit) {
      // Fixed scale: placeCamera() frames the charm every frame.
      VIEW_H = h / unit
      VIEW_W = w / unit
      return
    }
    camera.aspect = w / Math.max(h, 1)
    camera.zoom = Math.min(1, Math.sqrt(camera.aspect / 0.9)) // narrow screens: zoom out to fit
    VIEW_H = BASE_H / camera.zoom
    VIEW_W = VIEW_H * camera.aspect
    camera.updateProjectionMatrix()
  }
  // With a fixed unit the canvas can be far bigger than the charm (a whole
  // screen). Widening the lens to see all of it would stretch the charm like
  // a wide-angle photo, worst near the edges. Instead the camera stays right
  // in front of the charm with the original lens, and a shifted lens (view
  // offset) maps the rest of the canvas around it. On the z = 0 plane one
  // world unit is `unit` pixels everywhere, with the world's origin at the
  // canvas's top-left corner, so the knot and a resize never pull the charm.
  const EYE_DROP = 3.2 // the camera looks at the charm, this far below its knot
  const placeCamera = (at) => {
    const w = container.clientWidth || 1,
      h = container.clientHeight || 1
    const full =
      2 *
      camera.position.z *
      Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
      unit
    camera.position.x = at.x
    camera.position.y = at.y - EYE_DROP
    camera.aspect = 1
    camera.zoom = 1
    camera.setViewOffset(
      full,
      full,
      full / 2 - camera.position.x * unit,
      full / 2 + camera.position.y * unit,
      w,
      h
    )
  }
  resize()
  const resizer = new ResizeObserver(resize)
  resizer.observe(container)

  const pmrem = new THREE.PMREMGenerator(renderer)
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envTex
  scene.environmentIntensity = 0.85
  pmrem.dispose()

  const key = new THREE.DirectionalLight(0xfff1e0, 1.6)
  key.position.set(-3, 4, 5)
  key.castShadow = shadows
  key.shadow.mapSize.set(1024, 1024)
  key.shadow.radius = 10
  key.shadow.blurSamples = 16
  key.shadow.bias = -0.0005
  Object.assign(key.shadow.camera, {
    left: -6,
    right: 6,
    top: 6,
    bottom: -6,
    near: 1,
    far: 20,
  })
  const rim = new THREE.DirectionalLight(0xffe3b5, 2.4) // backlight so the outline reads against dark walls
  rim.position.set(2.5, 3, -6)
  // The key light keeps this offset from the charm (see the render loop), so
  // its shadow camera stays on the charm wherever it hangs on the canvas.
  const KEY_OFFSET = key.position.clone()
  scene.add(key, key.target, rim)

  // Invisible wall that only catches the shadow; big enough for a full-screen canvas.
  const wall = new THREE.Mesh(
    track(new THREE.PlaneGeometry(200, 200)),
    track(new THREE.ShadowMaterial({ color: 0x1a0000, opacity: 0.32 }))
  )
  wall.position.z = -1.6
  wall.receiveShadow = true
  if (shadows) scene.add(wall)

  /* ---------------- Textures ---------------- */
  function canvasTexture(w, h, draw, repeat) {
    const c = document.createElement("canvas")
    c.width = w
    c.height = h
    draw(c.getContext("2d"), w, h)
    const t = track(new THREE.CanvasTexture(c))
    if (repeat) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.repeat.set(...repeat)
    }
    return t
  }
  // Lemon peel colour: greener towards the tips, warm yellow in the middle, oil-gland speckles.
  const peelColor = canvasTexture(512, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, "#a9b02a")
    g.addColorStop(0.16, "#e2cf35")
    g.addColorStop(0.5, "#f3d838")
    g.addColorStop(0.84, "#e2cf35")
    g.addColorStop(1, "#a9b02a")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle =
        Math.random() < 0.5 ? "rgba(255,240,140,.35)" : "rgba(170,140,20,.25)"
      ctx.beginPath()
      ctx.arc(
        Math.random() * w,
        Math.random() * h,
        0.6 + Math.random() * 1.4,
        0,
        Math.PI * 2
      )
      ctx.fill()
    }
  })
  peelColor.colorSpace = THREE.SRGBColorSpace
  // Dimples for the bump map.
  const peelBump = canvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = "#808080"
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 4200; i++) {
      const x = Math.random() * w,
        y = Math.random() * h,
        r = 1 + Math.random() * 2.4
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, "rgba(30,30,30,.6)")
      g.addColorStop(1, "rgba(128,128,128,0)")
      ctx.fillStyle = g
      ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }
  })
  // Faint lengthwise streaks for chilli skin.
  const chiliBump = canvasTexture(
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = "#808080"
      ctx.fillRect(0, 0, w, h)
      for (let i = 0; i < 120; i++) {
        ctx.strokeStyle = `rgba(${Math.random() < 0.5 ? "60,60,60" : "200,200,200"},.25)`
        ctx.lineWidth = 0.5 + Math.random() * 1.5
        const x = Math.random() * w
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.bezierCurveTo(x + 6, h * 0.3, x - 6, h * 0.7, x + 3, h)
        ctx.stroke()
      }
    },
    [2, 1]
  )

  /* ---------------- Materials ---------------- */
  const CHILI_GREENS = [
    0x2c7a1c, 0x37881f, 0x25691a, 0x3b8f24, 0x2f7f1d, 0x2a7019,
  ]
  const chiliMats = CHILI_GREENS.map((c) =>
    track(
      new THREE.MeshPhysicalMaterial({
        color: c,
        roughness: 0.3,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        bumpMap: chiliBump,
        bumpScale: 0.6,
        sheen: 0.3,
        sheenColor: new THREE.Color(0x9fdc6a),
      })
    )
  )
  const calyxMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x4d6e1d,
      roughness: 0.8,
      envMapIntensity: 0.5,
    })
  )
  const stemMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x6b7f2a,
      roughness: 0.85,
      envMapIntensity: 0.5,
    })
  )
  const threadMat = track(
    new THREE.MeshStandardMaterial({ color: 0xf1e9d6, roughness: 0.95 })
  )
  const lemonMat = track(
    new THREE.MeshPhysicalMaterial({
      map: peelColor,
      roughness: 0.42,
      clearcoat: 0.5,
      clearcoatRoughness: 0.3,
      bumpMap: peelBump,
      bumpScale: 1.4,
    })
  )

  /* ---------------- Geometry ---------------- */
  // A chilli: lathe body with a soft three-lobed cross-section, shoulder bulge,
  // and a curled tip. The shoulder (stem end) sits at the origin, tip along -y.
  function chiliGeometry(len, r, curl, sway) {
    const pts = [],
      N = 36
    for (let i = 0; i <= N; i++) {
      const t = i / N // 0 = tip, 1 = shoulder
      const body =
        Math.pow(Math.sin((Math.min(t / 0.86, 1) * Math.PI) / 2), 0.68) *
        (1 - 0.1 * t)
      const shoulder = 1 + 0.1 * smooth(t, 0.7, 0.92)
      pts.push(new THREE.Vector2(Math.max(r * body * shoulder, 0.003), t * len))
    }
    pts.push(
      new THREE.Vector2(r * 0.8, len + 0.02),
      new THREE.Vector2(r * 0.42, len + 0.04),
      new THREE.Vector2(0.001, len + 0.045)
    )
    const g = new THREE.LatheGeometry(pts, 28)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i),
        z = pos.getZ(i)
      const y = pos.getY(i),
        t = Math.min(y / len, 1),
        ang = Math.atan2(z, x)
      const lobe =
        1 + 0.07 * Math.cos(3 * ang + t * 2.5) * smooth(t, 0.08, 0.45)
      const wrinkle = 1 + 0.02 * Math.sin(t * 34 + ang * 2)
      x *= lobe * wrinkle
      z *= lobe * wrinkle
      const f = 1 - t
      x += curl * f * f * f
      z += sway * Math.sin(f * Math.PI) * f
      pos.setX(i, x)
      pos.setZ(i, z)
    }
    g.translate(0, -len, 0)
    g.computeVertexNormals()
    return track(g)
  }
  // Five-lobed cap where the stem meets the chilli.
  function calyxGeometry(r) {
    const g = new THREE.CylinderGeometry(r * 0.5, r * 1.1, 0.07, 40, 2)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        y = pos.getY(i),
        z = pos.getZ(i)
      const ang = Math.atan2(z, x),
        low = y < 0 ? 1 : 0.35
      const k = 1 + 0.24 * Math.cos(5 * ang) * low
      pos.setXYZ(
        i,
        x * k,
        y - 0.045 * Math.max(0, Math.cos(5 * ang)) * low,
        z * k
      )
    }
    g.translate(0, 0.02, 0)
    g.computeVertexNormals()
    return track(g)
  }
  function stemGeometry(bend) {
    const c = new THREE.QuadraticBezierCurve3(
      new Vector3(0, 0.04, 0),
      new Vector3(0.02, 0.15, 0),
      new Vector3(-bend, 0.22, 0.02)
    )
    return track(new THREE.TubeGeometry(c, 12, 0.024, 8, false))
  }
  // Lemon: stretched sphere with pointed tips.
  function lemonGeometry(R) {
    const g = new THREE.SphereGeometry(R, 72, 54)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        y = pos.getY(i),
        z = pos.getZ(i)
      const u = y / R,
        a = Math.abs(u)
      const tip =
        Math.sign(u) * R * 0.26 * Math.pow(Math.max(0, a - 0.62) / 0.38, 3)
      const pinch = 1 - 0.12 * smooth(a, 0.55, 1)
      pos.setXYZ(i, x * pinch, y * 1.12 + tip, z * pinch)
    }
    g.computeVertexNormals()
    return track(g)
  }

  const CHILI_COUNT = 6,
    CHILI_GAP = 0.26,
    LEMON_R = 0.6
  const rand = (i, k) => {
    const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
    return s - Math.floor(s)
  }
  const meshes = []
  const mesh = (geo, mat) => {
    const m = new THREE.Mesh(geo, mat)
    m.castShadow = shadows
    meshes.push(m)
    return m
  }

  // Chilli cluster: threaded through the shoulders, fanned around the thread.
  const chiliGroup = new THREE.Group()
  for (let i = 0; i < CHILI_COUNT; i++) {
    const len = 1.0 + rand(i, 1) * 0.3,
      r = 0.135 + rand(i, 2) * 0.03
    const chili = new THREE.Group()
    chili.add(
      mesh(
        chiliGeometry(
          len,
          r,
          0.25 + rand(i, 3) * 0.25,
          (rand(i, 4) - 0.5) * 0.18
        ),
        chiliMats[i % chiliMats.length]
      )
    )
    chili.add(mesh(calyxGeometry(r), calyxMat))
    chili.add(mesh(stemGeometry(0.04 + rand(i, 5) * 0.06), stemMat))
    chili.rotation.z = Math.PI / 2 - 0.62 - (rand(i, 6) - 0.5) * 0.35 // tip outward and drooping
    chili.position.x = 0.05
    const pivot = new THREE.Group()
    pivot.position.y = -0.12 - i * CHILI_GAP
    pivot.rotation.y = i * 2.35 + rand(i, 7) * 0.4
    pivot.add(chili)
    chiliGroup.add(pivot)
  }
  const CHILI = 0.12 + (CHILI_COUNT - 1) * CHILI_GAP + 0.14 // thread length through the chillies
  const core = (len) =>
    mesh(
      track(
        new THREE.CylinderGeometry(0.02, 0.02, len, 6).translate(0, -len / 2, 0)
      ),
      threadMat
    )
  // Thread through the chillies; stretched in sync() so it always reaches the lemon.
  const chiliThread = core(CHILI)
  chiliGroup.add(chiliThread)

  const lemonGroup = new THREE.Group()
  const LEMON_GAP = 0.1
  const lemon = mesh(lemonGeometry(LEMON_R), lemonMat)
  lemon.position.y = -LEMON_GAP - LEMON_R * 1.38
  lemon.rotation.y = 0.6
  lemonGroup.add(lemon, core(LEMON_GAP + 0.1))
  const LEMON = LEMON_GAP + LEMON_R * 2.76

  const charm = new THREE.Group()
  charm.add(chiliGroup, lemonGroup)
  scene.add(charm)

  /* ---------------- Physics: anchor, 3 rope points, top, joint, bottom ---------------- */
  const SEG = 0.3,
    GRAVITY = -40,
    STEP = 1 / 120,
    DAMPING = 0.985,
    MAX_SPEED = 0.05
  // Elastic thread, like an ID-card reel: pull past its length and it stretches (up to STRETCH_MAX times);
  // let go and it snaps back, flinging the charm up before it settles.
  const STRETCH_MAX = 3.5,
    ROPE = 4 * SEG
  let stretch = 1,
    recoil = 0
  const MAX_BEND = THREE.MathUtils.degToRad(35)
  const anchorPoint = () => {
    if (unit) return new Vector3(anchorX() / unit, -anchorY() / unit + 0.1, 0)
    const h = container.clientHeight || 1,
      w = container.clientWidth || 1
    const x = (anchorX() / w - 0.5) * VIEW_W
    return new Vector3(x, VIEW_H / 2 - (anchorY() / h) * VIEW_H + 0.1, 0)
  }
  const x0 = anchorPoint().x
  const point = (y, mass) => {
    const p = new Vector3(x0, y, 0)
    return { p, q: p.clone(), w: mass ? 1 / mass : 0 }
  }
  const y0 = anchorPoint().y
  const pts = [0, 1, 2, 3, 4].map((i) =>
    point(y0 - i * SEG, i ? (i < 4 ? 1 : 1.5) : 0)
  )
  pts.push(
    point(y0 - 4 * SEG - CHILI, 1),
    point(y0 - 4 * SEG - CHILI - LEMON, 1.5)
  )
  const [top, joint, bottom] = pts.slice(4)
  const links = [
    ...pts.slice(0, 4).map((a, i) => [a, pts[i + 1], 0, SEG]),
    [top, joint, CHILI, CHILI],
    [joint, bottom, LEMON, LEMON],
    [
      top,
      bottom,
      Math.sqrt(
        CHILI ** 2 + LEMON ** 2 + 2 * CHILI * LEMON * Math.cos(MAX_BEND)
      ),
      Infinity,
    ],
  ]

  /* ---------------- Twisted three-ply thread ---------------- */
  const knotEnd = new Vector3()
  const curve = new THREE.CatmullRomCurve3(
    [...pts.slice(0, 5).map((p) => p.p), knotEnd],
    false,
    "chordal"
  )
  const plies = [0, 1, 2].map(() => {
    const m = mesh(new THREE.BufferGeometry(), threadMat)
    scene.add(m)
    return m
  })
  const SAMPLES = 64,
    PLY_OFFSET = 0.022,
    PLY_R = 0.024,
    TWIST = 0.3

  /* ---------------- Pointer: grab and fling, cursor wind ---------------- */
  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const plane = new THREE.Plane(new Vector3(0, 0, 1), 0)
  const target = new Vector3()
  const cursor = new Vector3(),
    lastCursor = new Vector3(),
    push = new Vector3()
  let hasCursor = false,
    grab = null,
    justDragged = false
  const aim = (x, y) => {
    const r = container.getBoundingClientRect()
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1)
    raycaster.setFromCamera(ndc, camera)
  }
  const hit = (x, y) => {
    aim(x, y)
    return raycaster.intersectObject(charm, true)[0]
  }

  const onDown = (e) => {
    const found = hit(e.clientX, e.clientY)
    if (!found) return
    e.preventDefault()
    const pick = [top, joint, bottom].reduce((a, b) =>
      b.p.distanceTo(found.point) < a.p.distanceTo(found.point) ? b : a
    )
    plane.constant = -pick.p.z
    raycaster.ray.intersectPlane(plane, target)
    // reach = thread length from the anchor to the grabbed point (the rope part can stretch beyond it).
    const reach =
      4 * SEG + (pick === top ? 0 : CHILI) + (pick === bottom ? LEMON : 0)
    grab = { pt: pick, offset: pick.p.clone().sub(target), w: pick.w, reach }
    pick.w = 0 // kinematic while held
    container.setPointerCapture?.(e.pointerId)
    container.style.cursor = "grabbing"
  }
  // passThrough: the canvas only takes the pointer while it's over the charm
  // (or holding it); everywhere else the page underneath gets it.
  const setCatch = (on) => {
    if (passThrough) container.style.pointerEvents = on ? "auto" : "none"
  }
  setCatch(false)
  const onMove = (e) => {
    aim(e.clientX, e.clientY)
    if (grab) {
      raycaster.ray.intersectPlane(plane, target)
      return
    }
    plane.constant = 0
    if (raycaster.ray.intersectPlane(plane, cursor)) {
      if (hasCursor)
        push.add(cursor.clone().sub(lastCursor).clampLength(0, 0.4))
      lastCursor.copy(cursor)
      hasCursor = true
    }
    const over = raycaster.intersectObject(charm, true).length > 0
    container.style.cursor = over ? "grab" : ""
    setCatch(over)
  }
  const onUp = () => {
    if (!grab) return
    grab.pt.w = grab.w
    grab = null
    justDragged = true
    container.style.cursor = ""
    setCatch(false)
    if (stretch > 1.05) recoil = 0.8 // seconds of fast motion while it snaps back
  }
  const onLeave = () => {
    hasCursor = false
  }
  const onClick = (e) => {
    if (justDragged) {
      e.preventDefault()
      e.stopPropagation()
    }
    justDragged = false
  }
  const onTouch = (e) => {
    if (hit(e.touches[0].clientX, e.touches[0].clientY)) e.preventDefault()
  }
  // Touch and pen have no hover to switch the canvas on first, so a press
  // that lands on the charm starts the grab from the window.
  const onPress = (e) => {
    if (hit(e.clientX, e.clientY)) {
      setCatch(true)
      onDown(e)
    }
  }
  // In pass-through mode, events come from the whole page, not just the canvas.
  const source = passThrough ? window : container
  const listeners = [
    [
      passThrough ? window : container,
      "pointerdown",
      passThrough ? onPress : onDown,
      passThrough,
    ],
    [source, "pointermove", onMove],
    [source, "pointerup", onUp],
    [source, "pointercancel", onUp],
    [
      passThrough ? document.documentElement : container,
      "pointerleave",
      onLeave,
    ],
    [source, "click", onClick, true],
    [source, "touchstart", onTouch, { passive: false }],
  ]
  for (const [el, type, fn, opt] of listeners)
    el.addEventListener(type, fn, opt)

  /* ---------------- Simulation ---------------- */
  let twist = 0,
    spin = 0,
    clock = 0
  function step() {
    clock += STEP
    const wind = breeze
      ? (Math.sin(clock * 0.6) * 0.6 + Math.sin(clock * 1.7 + 1) * 0.3) * 1.6
      : 0
    recoil = Math.max(0, recoil - STEP)
    if (!grab) stretch = 1 + (stretch - 1) * 0.9 // the elastic pulls back to its length
    const cap = recoil || stretch > 1.02 ? 0.2 : MAX_SPEED
    for (const pt of pts) {
      if (!pt.w) continue
      const v = pt.p
        .clone()
        .sub(pt.q)
        .multiplyScalar(DAMPING)
        .clampLength(0, cap)
      pt.q.copy(pt.p)
      pt.p.add(v)
      pt.p.y += GRAVITY * STEP * STEP
      pt.p.x += wind * STEP * STEP
      pt.p.z *= 0.98
    }
    // Cursor wind: nudge points the pointer sweeps through.
    if (push.lengthSq() > 1e-8) {
      for (const pt of pts) {
        if (!pt.w) continue
        const d = pt.p.distanceTo(cursor)
        if (d < 0.9) pt.p.addScaledVector(push, 0.06 * (1 - d / 0.9))
      }
      push.multiplyScalar(0.8)
    }
    if (grab) {
      const goal = target.clone().add(grab.offset)
      const fromAnchor = goal.clone().sub(pts[0].p)
      const rigid = grab.reach - ROPE // charm thread below the rope: doesn't stretch
      stretch = Math.min(
        Math.max((fromAnchor.length() - rigid) / ROPE, 1),
        STRETCH_MAX
      )
      const reach = rigid + ROPE * stretch
      if (fromAnchor.length() > reach)
        goal.copy(pts[0].p).add(fromAnchor.setLength(reach)) // fully stretched
      grab.pt.q.copy(grab.pt.p)
      grab.pt.p.lerp(goal, 0.35)
    }
    // Gentle straightening so the lemon hangs in line with the chillies.
    const sw = top.w + bottom.w
    if (sw) {
      const straight = joint.p
        .clone()
        .sub(top.p)
        .setLength(LEMON)
        .add(joint.p)
        .sub(bottom.p)
        .multiplyScalar(8e-4 / sw)
      bottom.p.addScaledVector(straight, bottom.w)
      top.p.addScaledVector(straight, -top.w)
    }
    for (let n = 0; n < 30; n++) {
      for (const [a, b, min, max] of links) {
        const ws = a.w + b.w
        if (!ws) continue
        const top_ = max === SEG ? SEG * stretch : max // rope segments stretch with the elastic
        const d = b.p.clone().sub(a.p),
          dist = d.length() || 1e-6,
          len = Math.min(Math.max(dist, min), top_)
        if (len === dist) continue
        d.multiplyScalar((dist - len) / dist / ws)
        a.p.addScaledVector(d, a.w)
        b.p.addScaledVector(d, -b.w)
      }
    }
    if (!grab) spin += (bottom.p.x - bottom.q.x) * 0.12
    spin = (spin - twist * 0.01) * 0.93
    twist += spin
  }

  const DOWN = new Vector3(0, -1, 0),
    UP = new Vector3(0, 1, 0),
    qa = new Quaternion(),
    qb = new Quaternion()
  function sync() {
    chiliGroup.position.copy(top.p)
    chiliThread.scale.y = Math.max(1, top.p.distanceTo(joint.p) / CHILI)
    chiliGroup.quaternion
      .setFromUnitVectors(DOWN, joint.p.clone().sub(top.p).normalize())
      .multiply(qa.setFromAxisAngle(UP, twist))
    lemonGroup.position.copy(joint.p)
    lemonGroup.quaternion
      .setFromUnitVectors(DOWN, bottom.p.clone().sub(joint.p).normalize())
      .multiply(qb.setFromAxisAngle(UP, twist * 0.9))
    knotEnd.copy(joint.p).sub(top.p).setLength(0.08).add(top.p)
    const centre = curve.getSpacedPoints(SAMPLES)
    const { normals, binormals } = curve.computeFrenetFrames(SAMPLES, false)
    const length = curve.getLength()
    plies.forEach((ply, k) => {
      const path = centre.map((c, i) => {
        const a =
          (2 * Math.PI * length * (1 - i / SAMPLES)) / TWIST +
          (k * 2 * Math.PI) / 3 +
          twist
        return c
          .clone()
          .addScaledVector(normals[i], Math.cos(a) * PLY_OFFSET)
          .addScaledVector(binormals[i], Math.sin(a) * PLY_OFFSET)
      })
      ply.geometry.dispose()
      ply.geometry = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(path),
        SAMPLES,
        PLY_R,
        5
      )
    })
  }

  // The anchor follows anchorY() and sways sideways with how fast it moves.
  // A full-screen canvas is nearly all empty. Draw only a box around the
  // thread, the charm and its shadow (the scissor test skips every other
  // pixel), so it costs about what the original small canvas did. Outside
  // the box the canvas stays transparent, since WebGL clears it every frame.
  const MARGIN = 2.6 // world units around the points: chilli fan, lemon, shadow
  const clipToCharm = () => {
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity
    for (const { p } of pts) {
      minX = Math.min(minX, p.x)
      maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y)
      maxY = Math.max(maxY, p.y)
    }
    const w = container.clientWidth,
      h = container.clientHeight
    const left = Math.max(0, (minX - MARGIN) * unit),
      right = Math.min(w, (maxX + MARGIN) * unit)
    const upper = Math.max(0, -(maxY + MARGIN) * unit),
      lower = Math.min(h, -(minY - MARGIN) * unit)
    renderer.setScissorTest(true)
    renderer.setScissor(
      left,
      h - lower,
      Math.max(0, right - left),
      Math.max(0, lower - upper)
    )
  }

  let sway = 0,
    last = performance.now(),
    acc = 0
  sync()
  if (unit) placeCamera(pts[0].p)
  renderer.setAnimationLoop((now) => {
    const dt = Math.min(now - last, 50) / 1000
    last = now
    if (!active()) return
    acc += dt
    const steps = Math.floor(acc / STEP)
    acc -= steps * STEP
    const from = pts[0].p.clone(),
      to = anchorPoint()
    // When the knot moves a lot in one frame (a scroll, or coming back after
    // a pause), carry the whole charm along with it and leave only the last
    // bit to the physics. Dragging it all the way would stretch the thread.
    const jump = to.clone().sub(from),
      FOLLOW = 0.15
    if (jump.length() > FOLLOW) {
      const carry = jump.setLength(jump.length() - FOLLOW)
      for (const pt of pts) {
        pt.p.add(carry)
        pt.q.add(carry)
      }
      from.add(carry)
    }
    sway +=
      (Math.max(-0.6, Math.min(0.6, (to.y - from.y) * 4)) - sway) *
      Math.min(1, dt * 5)
    to.x += sway
    for (let i = 1; i <= steps; i++) {
      pts[0].p.lerpVectors(from, to, i / steps)
      step()
    }
    sync()
    key.target.position.copy(joint.p)
    key.position.copy(joint.p).add(KEY_OFFSET)
    if (unit) {
      placeCamera(pts[0].p)
      clipToCharm()
    }
    renderer.render(scene, camera)
  })

  return {
    dispose() {
      renderer.setAnimationLoop(null)
      resizer.disconnect()
      for (const [el, type, fn, opt] of listeners)
        el.removeEventListener(type, fn, opt)
      plies.forEach((p) => p.geometry.dispose())
      disposables.forEach((d) => d.dispose())
      envTex.dispose()
      renderer.dispose()
    },
  }
}
