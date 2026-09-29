'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowBigUp, BookOpen, MessageCircleQuestion, MessagesSquare, Minus, PawPrint, Plus, RotateCcw } from 'lucide-react'

export type KnowledgeStory = { question: string; guide: string }

const FALLBACK: KnowledgeStory[] = [
  { question: 'Why does my dog eat grass?', guide: 'Why dogs eat grass, and when to worry' },
  { question: 'How do I stop my puppy biting?', guide: 'Gentle ways to end puppy biting' },
  { question: 'Is my indoor cat bored?', guide: 'A richer life for indoor cats' },
  { question: 'How often should my old dog see the vet?', guide: 'Vet visits for senior dogs' },
]

type NodeId = 'ask' | 'guide' | 'community' | 'core' | 'grrr'
/** The loop, in story order. Edge k joins ORDER[k] to ORDER[k + 1] (the last one closes the loop). */
const ORDER: NodeId[] = ['ask', 'guide', 'community', 'core', 'grrr']
const STAGES = ['Ask', 'Guide', 'Community', 'Learn'] as const
const RGB = { coral: '232,111,82', sage: '184,205,185', yellow: '241,199,91', cream: '247,245,239' }
const EDGE_RGB = [RGB.coral, RGB.sage, RGB.yellow, RGB.coral, RGB.sage]
const PHASE_MS = [2800, 2600, 3800, 2400, 2800]
const LAYOUTS: Record<'wide' | 'tall', Record<NodeId, [number, number]>> = {
  wide: { ask: [0.15, 0.34], guide: [0.43, 0.2], community: [0.8, 0.37], core: [0.53, 0.65], grrr: [0.19, 0.8] },
  tall: { ask: [0.4, 0.09], guide: [0.6, 0.27], community: [0.45, 0.47], core: [0.55, 0.67], grrr: [0.45, 0.85] },
}
const BASE_LEARNED = 128

type Body = { x: number; y: number; vx: number; vy: number; hx: number; hy: number; depth: number; seed: number; pulse: number }
type Curve = { ax: number; ay: number; cx: number; cy: number; bx: number; by: number }
type Api = { act: (id: NodeId) => void; jump: (phase: number) => void; upvote: (n: number) => void; zoom: (factor: number) => void; reset: () => void }

function point(q: Curve, t: number) {
  const u = 1 - t
  return { x: u * u * q.ax + 2 * u * t * q.cx + t * t * q.bx, y: u * u * q.ay + 2 * u * t * q.cy + t * t * q.by }
}

/**
 * The Grr knowledge loop, alive: a question becomes a guide, the guide opens a community thread, upvotes pick
 * what helps, the best of it is absorbed by the knowledge core and flows into GRRR, the Grr Care assistant.
 * Canvas draws the connections and particles; the cards are real buttons on top (draggable, hoverable, clickable).
 */
export function KnowledgeFlow({ stories }: { stories: KnowledgeStory[] }) {
  // Real guides first; examples fill in while there are only a few, so the loop doesn't repeat one question
  const list = stories.length >= 4 ? stories : [...stories, ...FALLBACK.filter((f) => !stories.some((s) => s.question.toLowerCase() === f.question.toLowerCase()))]
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<Partial<Record<NodeId, HTMLButtonElement | null>>>({})
  const api = useRef<Api | null>(null)
  const suppressClick = useRef(false)
  const [phase, setPhase] = useState(0)
  const [index, setIndex] = useState(0)
  const [votes, setVotes] = useState(0)
  const [learned, setLearned] = useState(BASE_LEARNED)
  const story = list[index % list.length]

  useEffect(() => {
    const stage = stageRef.current, canvas = canvasRef.current, world = worldRef.current
    const ctx = canvas?.getContext('2d')
    if (!stage || !canvas || !world || !ctx) return
    const host: HTMLDivElement = stage
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const speed = reduced ? 0.3 : 1

    let w = 0, h = 0, dpr = 1, tall = false
    const bodies = Object.fromEntries(ORDER.map((id, i) => [id, { x: 0, y: 0, vx: 0, vy: 0, hx: 0, hy: 0, depth: [0.7, 1, 0.85, 0.35, 0.9][i], seed: i * 1.9, pulse: 0 }])) as Record<NodeId, Body>
    const view = { x: 0, y: 0, z: 1 }
    const pointer = { x: 0, y: 0, inside: false }
    let drag: { id: NodeId | null; el: Element; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null = null

    let phaseNow = 0, phaseT = 0, pausedUntil = 0, storyIndex = 0, learnedCount = BASE_LEARNED, voteCount = 0
    let coreGlow = 0.4, grrrGlow = 0

    const flows = EDGE_RGB.flatMap((_, k) => Array.from({ length: 7 }, () => ({ k, t: Math.random(), v: 0.00008 + Math.random() * 0.00012, s: 0.8 + Math.random() * 1.2 })))
    let packets: { k: number; t: number }[] = []
    let upvotes: { x: number; y: number; t: number; delay: number; wob: number }[] = []
    let rings: { x: number; y: number; r: number; life: number; rgb: string }[] = []
    let inflow: { a: number; d: number; v: number }[] = []
    const avatars = Array.from({ length: 8 }, (_, i) => ({ a: (i / 8) * Math.PI * 2, v: 0.00012 + Math.random() * 0.00016, s: 5 + Math.random() * 4, rgb: [RGB.sage, RGB.cream, RGB.yellow, RGB.coral][i % 4], lift: Math.random() * Math.PI * 2 }))
    const dot = () => ({ a: Math.random() * Math.PI * 2, r: 24 + Math.random() * 92, v: (0.00025 + Math.random() * 0.0007) * (Math.random() < 0.5 ? 1 : -1), tilt: (Math.random() - 0.5) * 1.3, s: 0.5 + Math.random() * 1.4, rgb: Math.random() < 0.22 ? RGB.coral : Math.random() < 0.5 ? RGB.yellow : RGB.cream })
    const coreDots = Array.from({ length: reduced ? 120 : 260 }, dot)
    const MAX_DOTS = reduced ? 160 : 560

    function layout() {
      const r = stage!.getBoundingClientRect()
      w = r.width; h = r.height; tall = w < 700
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas!.width = Math.round(w * dpr); canvas!.height = Math.round(h * dpr)
      const L = LAYOUTS[tall ? 'tall' : 'wide']
      for (const id of ORDER) {
        const b = bodies[id]
        b.hx = L[id][0] * w; b.hy = L[id][1] * h
        if (!b.x && !b.y) { b.x = b.hx; b.y = b.hy }
      }
    }

    const curve = (k: number): Curve => {
      const a = bodies[ORDER[k]], b = bodies[ORDER[(k + 1) % ORDER.length]]
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1
      const bend = (k % 2 ? -1 : 1) * 0.17 * len
      return { ax: a.x, ay: a.y, bx: b.x, by: b.y, cx: (a.x + b.x) / 2 - (dy / len) * bend, cy: (a.y + b.y) / 2 + (dx / len) * bend }
    }

    const avatarPos = (i: number, time: number) => {
      const c = bodies.community, av = avatars[i]
      const gather = phaseNow === 2 ? 1 : 0
      const R = (tall ? 120 : 150) - gather * (tall ? 10 : 26)
      // Wide enough to leave the card and its label clear
      return { x: c.x + Math.cos(av.a) * R * (tall ? 1.02 : 1.08), y: c.y + Math.sin(av.a) * R * (tall ? 0.9 : 0.62) + Math.sin(time * 0.002 + av.lift) * 3 }
    }

    function spawnVotes(n: number) {
      for (let i = 0; i < n; i++) {
        const p = avatarPos(Math.floor(Math.random() * avatars.length), performance.now())
        upvotes.push({ x: p.x, y: p.y, t: 0, delay: i * 170 + Math.random() * 120, wob: Math.random() * 2 - 1 })
      }
    }

    function arrive(target: number) {
      const id = ORDER[target], b = bodies[id]
      b.pulse = 1
      rings.push({ x: b.x, y: b.y, r: 24, life: 1, rgb: EDGE_RGB[(target + 4) % 5] })
      if (id === 'community') spawnVotes(7 + Math.floor(Math.random() * 4))
      if (id === 'core') {
        coreGlow = Math.min(1.8, coreGlow + 0.9)
        for (let i = 0; i < 46; i++) inflow.push({ a: Math.random() * Math.PI * 2, d: 130 + Math.random() * 90, v: 0.05 + Math.random() * 0.08 })
      }
      if (id === 'grrr') {
        grrrGlow = 1
        learnedCount += 1
        setLearned(learnedCount)
      }
    }

    function jump(next: number) {
      phaseNow = ((next % 5) + 5) % 5
      phaseT = 0
      packets.push({ k: (phaseNow + 4) % 5, t: 0 })
      if (phaseNow === 0) {
        storyIndex += 1
        voteCount = 0
        setIndex(storyIndex)
        setVotes(0)
      }
      setPhase(phaseNow)
    }

    const pause = () => { pausedUntil = performance.now() + 7000 }

    api.current = {
      /** Clicking a piece moves the story on from it: question → guide → thread → knowledge → GRRR → new question. */
      act(id) {
        pause()
        if (id === 'community') { spawnVotes(5); bodies.community.pulse = 0.6 }
        if (id === 'core') { coreGlow = Math.min(1.8, coreGlow + 0.5); rings.push({ x: bodies.core.x, y: bodies.core.y, r: 30, life: 1, rgb: RGB.yellow }) }
        jump(ORDER.indexOf(id) + 1)
      },
      jump(p) { pause(); jump(p) },
      upvote(n) { spawnVotes(n); bodies.community.pulse = 0.4 },
      zoom(factor) {
        const nz = Math.min(1.35, Math.max(0.8, view.z * factor))
        view.x = w / 2 - ((w / 2 - view.x) * nz) / view.z
        view.y = h / 2 - ((h / 2 - view.y) * nz) / view.z
        view.z = nz
      },
      reset() {
        view.x = 0; view.y = 0; view.z = 1
        const L = LAYOUTS[tall ? 'tall' : 'wide']
        for (const id of ORDER) { bodies[id].hx = L[id][0] * w; bodies[id].hy = L[id][1] * h }
      },
    }

    // ---------- pointer: drag pieces, pan the map (mouse only, so phones keep scrolling), zoom with ctrl/⌘ + wheel ----------
    const toWorld = (e: PointerEvent | WheelEvent) => {
      const r = host.getBoundingClientRect()
      return { x: (e.clientX - r.left - view.x) / view.z, y: (e.clientY - r.top - view.y) / view.z }
    }
    function down(e: PointerEvent) {
      if ((e.target as Element).closest('.kf-controls, .kf-legend')) return
      const nodeEl = (e.target as Element).closest<HTMLElement>('[data-node]')
      const p = toWorld(e)
      if (nodeEl) {
        const id = nodeEl.dataset.node as NodeId
        drag = { id, el: nodeEl, sx: e.clientX, sy: e.clientY, ox: p.x - bodies[id].x, oy: p.y - bodies[id].y, moved: false }
        nodeEl.setPointerCapture(e.pointerId)
      } else if (e.pointerType === 'mouse') {
        drag = { id: null, el: host, sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y, moved: false }
        host.setPointerCapture(e.pointerId)
        host.classList.add('is-panning')
      }
    }
    function move(e: PointerEvent) {
      const p = toWorld(e)
      pointer.x = p.x; pointer.y = p.y; pointer.inside = true
      if (!drag) return
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 4) drag.moved = true
      if (!drag.moved) return
      if (drag.id) {
        const b = bodies[drag.id]
        b.x = b.hx = p.x - drag.ox
        b.y = b.hy = p.y - drag.oy
        b.vx = b.vy = 0
        pause()
      } else {
        view.x = drag.ox + (e.clientX - drag.sx)
        view.y = drag.oy + (e.clientY - drag.sy)
      }
    }
    function up() {
      if (drag?.moved && drag.id) suppressClick.current = true
      drag = null
      host.classList.remove('is-panning')
    }
    function leave() { pointer.inside = false }
    function wheel(e: WheelEvent) {
      if (!e.ctrlKey && !e.metaKey) return // plain wheel scrolls the page
      e.preventDefault()
      const p = { x: e.clientX - host.getBoundingClientRect().left, y: e.clientY - host.getBoundingClientRect().top }
      const nz = Math.min(1.35, Math.max(0.8, view.z * (e.deltaY < 0 ? 1.08 : 0.93)))
      view.x = p.x - ((p.x - view.x) * nz) / view.z
      view.y = p.y - ((p.y - view.y) * nz) / view.z
      view.z = nz
    }
    host.addEventListener('pointerdown', down)
    host.addEventListener('pointermove', move)
    host.addEventListener('pointerup', up)
    host.addEventListener('pointercancel', up)
    host.addEventListener('pointerleave', leave)
    host.addEventListener('wheel', wheel, { passive: false })

    // ---------- the loop ----------
    let visible = true, raf = 0, last = performance.now()
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting })
    io.observe(stage)
    const ro = new ResizeObserver(layout)
    ro.observe(stage)
    layout()

    function frame(now: number) {
      raf = requestAnimationFrame(frame)
      const elapsed = now - last
      const dt = Math.min(48, elapsed) * speed // motion: capped so a slow frame never makes things jump
      last = now
      if (!visible || document.hidden) return
      const f = dt / 16.67

      // story clock: real time, so the story keeps its pace even on a slow device
      phaseT += Math.min(1000, elapsed) * speed
      if (now > pausedUntil && phaseT > PHASE_MS[phaseNow] / speed) jump(phaseNow + 1)

      // bodies: spring home + slow float + parallax + a soft pull toward a nearby cursor
      const pcx = pointer.inside ? (pointer.x - w / 2) * 0.018 : 0, pcy = pointer.inside ? (pointer.y - h / 2) * 0.018 : 0
      for (const id of ORDER) {
        const b = bodies[id]
        if (drag?.id === id && drag.moved) continue
        let tx = b.hx + Math.sin(now * 0.00045 + b.seed) * 7 + pcx * b.depth
        let ty = b.hy + Math.cos(now * 0.00037 + b.seed * 1.3) * 9 + pcy * b.depth
        if (pointer.inside) {
          const dx = pointer.x - b.x, dy = pointer.y - b.y, d = Math.hypot(dx, dy)
          if (d < 190) { tx += dx * 0.06 * (1 - d / 190); ty += dy * 0.06 * (1 - d / 190) }
        }
        b.vx = (b.vx + (tx - b.x) * 0.04 * f) * Math.pow(0.84, f)
        b.vy = (b.vy + (ty - b.y) * 0.04 * f) * Math.pow(0.84, f)
        b.x += b.vx * f; b.y += b.vy * f
        b.pulse *= Math.pow(0.93, f)
        const el = nodeRefs.current[id]
        if (el) el.style.transform = `translate3d(${b.x}px, ${b.y}px, 0) translate(-50%, -50%) scale(${1 + b.pulse * 0.07})`
      }
      coreGlow += (0.4 + Math.min(0.5, voteCount * 0.03) - coreGlow) * 0.0016 * dt
      grrrGlow *= Math.pow(0.985, f)
      const grrrEl = nodeRefs.current.grrr
      if (grrrEl) grrrEl.style.setProperty('--glow', String(Math.min(1, 0.25 + (learnedCount - BASE_LEARNED) * 0.06 + grrrGlow * 0.6)))
      world!.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.z})`

      // ---------- draw ----------
      ctx!.setTransform(1, 0, 0, 1, 0, 0)
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
      ctx!.setTransform(dpr * view.z, 0, 0, dpr * view.z, dpr * view.x, dpr * view.y)
      ctx!.globalCompositeOperation = 'lighter'
      const curves = ORDER.map((_, k) => curve(k))
      const activeEdge = (phaseNow + 4) % 5

      // connections: thin, brighter where the story is right now
      curves.forEach((q, k) => {
        const active = k === activeEdge
        ctx!.beginPath()
        ctx!.moveTo(q.ax, q.ay)
        ctx!.quadraticCurveTo(q.cx, q.cy, q.bx, q.by)
        ctx!.strokeStyle = `rgba(${EDGE_RGB[k]},${active ? 0.42 : 0.13})`
        ctx!.lineWidth = active ? 1.6 : 1
        ctx!.stroke()
      })

      // ambient particles along every connection
      for (const p of flows) {
        p.t = (p.t + p.v * dt * (p.k === activeEdge ? 2.4 : 1)) % 1
        const pt = point(curves[p.k], p.t)
        const a = Math.sin(p.t * Math.PI) * (p.k === activeEdge ? 0.95 : 0.45)
        ctx!.fillStyle = `rgba(${EDGE_RGB[p.k]},${a})`
        ctx!.beginPath(); ctx!.arc(pt.x, pt.y, p.s, 0, Math.PI * 2); ctx!.fill()
      }

      // packets: the story travelling from one stage to the next, with a comet tail
      packets = packets.filter((p) => {
        p.t += dt * 0.00075
        if (p.t >= 1) { arrive((p.k + 1) % 5); return false }
        for (let i = 7; i >= 0; i--) {
          const tt = Math.max(0, p.t - i * 0.018)
          const pt = point(curves[p.k], tt)
          ctx!.fillStyle = `rgba(${EDGE_RGB[p.k]},${(1 - i / 8) * 0.9})`
          ctx!.beginPath(); ctx!.arc(pt.x, pt.y, 4.2 - i * 0.4, 0, Math.PI * 2); ctx!.fill()
        }
        const head = point(curves[p.k], p.t)
        const g = ctx!.createRadialGradient(head.x, head.y, 0, head.x, head.y, 22)
        g.addColorStop(0, `rgba(${EDGE_RGB[p.k]},0.55)`); g.addColorStop(1, `rgba(${EDGE_RGB[p.k]},0)`)
        ctx!.fillStyle = g
        ctx!.beginPath(); ctx!.arc(head.x, head.y, 22, 0, Math.PI * 2); ctx!.fill()
        return true
      })

      // community: members orbit the thread, and gather while it is discussed
      avatars.forEach((av, i) => {
        av.a += av.v * dt * (phaseNow === 2 ? 2.2 : 1)
        const p = avatarPos(i, now)
        ctx!.fillStyle = `rgba(${av.rgb},${phaseNow === 2 ? 0.9 : 0.5})`
        ctx!.beginPath(); ctx!.arc(p.x, p.y, av.s, 0, Math.PI * 2); ctx!.fill()
        ctx!.strokeStyle = `rgba(${RGB.cream},0.25)`
        ctx!.lineWidth = 1
        ctx!.beginPath(); ctx!.arc(p.x, p.y, av.s + 3, 0, Math.PI * 2); ctx!.stroke()
        if (phaseNow === 2) {
          const c = bodies.community
          ctx!.strokeStyle = `rgba(${RGB.sage},0.12)`
          ctx!.beginPath(); ctx!.moveTo(p.x, p.y); ctx!.lineTo(c.x, c.y); ctx!.stroke()
        }
      })

      // upvotes: small signals flying from members to the thread; each one lands with a spark
      const c = bodies.community
      upvotes = upvotes.filter((u) => {
        if (u.delay > 0) { u.delay -= dt; return true }
        u.t += dt * 0.0011
        if (u.t >= 1) {
          voteCount += 1
          setVotes(voteCount)
          c.pulse = Math.max(c.pulse, 0.45)
          rings.push({ x: c.x, y: c.y - 8, r: 10, life: 0.8, rgb: RGB.coral })
          return false
        }
        const e = 1 - Math.pow(1 - u.t, 3)
        const x = u.x + (c.x - u.x) * e + Math.sin(u.t * Math.PI) * 26 * u.wob
        const y = u.y + (c.y - 10 - u.y) * e - Math.sin(u.t * Math.PI) * 30
        ctx!.fillStyle = `rgba(${RGB.coral},0.95)`
        ctx!.beginPath(); ctx!.moveTo(x, y - 6); ctx!.lineTo(x + 5, y + 3); ctx!.lineTo(x - 5, y + 3); ctx!.closePath(); ctx!.fill()
        const g = ctx!.createRadialGradient(x, y, 0, x, y, 12)
        g.addColorStop(0, `rgba(${RGB.coral},0.35)`); g.addColorStop(1, `rgba(${RGB.coral},0)`)
        ctx!.fillStyle = g
        ctx!.beginPath(); ctx!.arc(x, y, 12, 0, Math.PI * 2); ctx!.fill()
        return true
      })

      // the knowledge core: a warm glow, hundreds of orbiting particles, new knowledge spiralling in
      const k = bodies.core
      const glow = Math.min(1.8, coreGlow)
      const halo = ctx!.createRadialGradient(k.x, k.y, 0, k.x, k.y, 120 + glow * 30)
      halo.addColorStop(0, `rgba(${RGB.coral},${0.34 * glow})`)
      halo.addColorStop(0.45, `rgba(${RGB.yellow},${0.08 * glow})`)
      halo.addColorStop(1, 'rgba(0,0,0,0)')
      ctx!.fillStyle = halo
      ctx!.beginPath(); ctx!.arc(k.x, k.y, 120 + glow * 30, 0, Math.PI * 2); ctx!.fill()
      for (const d of coreDots) {
        d.a += d.v * dt * (0.7 + glow * 0.5)
        const ex = Math.cos(d.a) * d.r, ey = Math.sin(d.a) * d.r * 0.42
        const x = k.x + ex * Math.cos(d.tilt) - ey * Math.sin(d.tilt)
        const y = k.y + ex * Math.sin(d.tilt) + ey * Math.cos(d.tilt)
        const depth = (Math.sin(d.a) + 1) / 2
        ctx!.fillStyle = `rgba(${d.rgb},${(0.18 + depth * 0.55) * Math.min(1, 0.45 + glow * 0.4)})`
        ctx!.beginPath(); ctx!.arc(x, y, d.s * (0.7 + depth * 0.5), 0, Math.PI * 2); ctx!.fill()
      }
      inflow = inflow.filter((p) => {
        p.d -= p.v * dt
        p.a += 0.0035 * dt
        if (p.d < 18) { if (coreDots.length < MAX_DOTS) coreDots.push(dot()); return false }
        const x = k.x + Math.cos(p.a) * p.d, y = k.y + Math.sin(p.a) * p.d * 0.6
        ctx!.fillStyle = `rgba(${RGB.yellow},${Math.min(1, p.d / 60)})`
        ctx!.beginPath(); ctx!.arc(x, y, 1.6, 0, Math.PI * 2); ctx!.fill()
        return true
      })
      const heart = ctx!.createRadialGradient(k.x, k.y, 0, k.x, k.y, 26 + glow * 6)
      heart.addColorStop(0, `rgba(${RGB.cream},${0.75 + glow * 0.1})`)
      heart.addColorStop(0.35, `rgba(${RGB.yellow},${0.5 * glow})`)
      heart.addColorStop(1, `rgba(${RGB.coral},0)`)
      ctx!.fillStyle = heart
      ctx!.beginPath(); ctx!.arc(k.x, k.y, 26 + glow * 6, 0, Math.PI * 2); ctx!.fill()

      // sparks where something arrives
      rings = rings.filter((r) => {
        r.r += dt * 0.07; r.life -= dt * 0.0016
        if (r.life <= 0) return false
        ctx!.strokeStyle = `rgba(${r.rgb},${r.life * 0.6})`
        ctx!.lineWidth = 1.2
        ctx!.beginPath(); ctx!.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx!.stroke()
        return true
      })
      ctx!.globalCompositeOperation = 'source-over'
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect(); ro.disconnect()
      host.removeEventListener('pointerdown', down)
      host.removeEventListener('pointermove', move)
      host.removeEventListener('pointerup', up)
      host.removeEventListener('pointercancel', up)
      host.removeEventListener('pointerleave', leave)
      host.removeEventListener('wheel', wheel)
      api.current = null
    }
  }, [])

  const act = (id: NodeId) => () => {
    if (suppressClick.current) { suppressClick.current = false; return } // that was a drag
    api.current?.act(id)
  }
  const nodeProps = (id: NodeId, stageIndex: number) => ({
    'data-node': id,
    ref: (el: HTMLButtonElement | null) => { nodeRefs.current[id] = el },
    className: `kf-node kf-${id}${phase === stageIndex ? ' is-active' : ''}`,
    onClick: act(id),
    type: 'button' as const,
  })
  const activeStage = Math.min(phase, 3)

  return (
    <div className="kf">
      <ol className="sr-only">
        <li>A pet owner asks a question in Grr Care, for example: “{story.question}”</li>
        <li>It becomes a guide: “{story.guide}”.</li>
        <li>The guide opens a thread, and the community upvotes the most useful answers.</li>
        <li>The best knowledge is captured, and GRRR, the Grr Care assistant, learns from it.</li>
      </ol>
      <div className="kf-stage" ref={stageRef}>
        <canvas className="kf-canvas" ref={canvasRef} aria-hidden="true" />
        <div className="kf-world" ref={worldRef}>
          <button {...nodeProps('ask', 0)} aria-label={`Question: ${story.question}. Turn it into a guide`}>
            <span className="kf-label">Ask</span>
            <span className="kf-card">
              <MessageCircleQuestion size={16} />
              <span className="kf-question" key={`q${index}`}>“{story.question}”</span>
              <small>asked in Grr Care</small>
            </span>
            <span className="kf-tip">A real owner’s question. Click it to turn it into a guide.</span>
          </button>

          <button {...nodeProps('guide', 1)} aria-label={`Guide: ${story.guide}. Open its thread`}>
            <span className="kf-label">Guide</span>
            <span className={`kf-card kf-doc${phase >= 1 ? ' is-written' : ''}`}>
              <BookOpen size={16} />
              <span className="kf-doc-title" key={`g${index}-${phase >= 1}`}>{phase >= 1 ? story.guide : 'Writing the guide…'}</span>
              <span className="kf-doc-lines" aria-hidden="true"><i /><i /><i /></span>
            </span>
            <span className="kf-tip">Each week a question becomes a careful guide. Click to open its community thread.</span>
          </button>

          <button {...nodeProps('community', 2)} aria-label={`Community thread, ${votes} upvotes. Send upvotes`} onMouseEnter={() => api.current?.upvote(3)}>
            <span className="kf-label">Community</span>
            <span className={`kf-card kf-thread${phase >= 2 ? ' is-open' : ''}`}>
              <MessagesSquare size={16} />
              <span className="kf-thread-head">{phase >= 2 ? story.guide : 'Waiting for a guide'}</span>
              <span className="kf-votes"><ArrowBigUp size={15} /> {votes}</span>
            </span>
            <span className="kf-tip">Members upvote what really helps. Hover to send a few upvotes.</span>
          </button>

          <button {...nodeProps('core', 3)} aria-label="Knowledge core. Send its knowledge to GRRR">
            <span className="kf-core-hit" />
            <span className="kf-label">Learn</span>
            <span className="kf-tip">The best of guides and threads becomes care knowledge. Click to send it to GRRR.</span>
          </button>

          <button {...nodeProps('grrr', 4)} aria-label={`GRRR, the Grr Care assistant, has learned ${learned} things. Ask a new question`}>
            <span className="kf-card kf-assistant">
              <span className="kf-grrr-avatar"><PawPrint size={18} strokeWidth={2.4} /></span>
              <span><strong>GRRR</strong><small>{learned} things learned</small></span>
            </span>
            <span className="kf-tip">The Grr Care assistant answers from everything the community taught it. Click for a new question.</span>
          </button>
        </div>

        <div className="kf-legend" aria-label="Stages">
          {STAGES.map((label, i) => (
            <button key={label} type="button" className={activeStage === i ? 'is-active' : ''} onClick={() => api.current?.jump(i)}><i />{label}</button>
          ))}
        </div>
        <div className="kf-controls">
          <button type="button" aria-label="Zoom out" onClick={() => api.current?.zoom(0.9)}><Minus size={14} /></button>
          <button type="button" aria-label="Zoom in" onClick={() => api.current?.zoom(1.1)}><Plus size={14} /></button>
          <button type="button" aria-label="Reset the view" onClick={() => api.current?.reset()}><RotateCcw size={13} /></button>
        </div>
        <p className="kf-hint" aria-hidden="true">Drag the pieces · hover · click</p>
      </div>
    </div>
  )
}
