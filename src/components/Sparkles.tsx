import { useEffect, useRef } from 'react'

type Props = {
  className?: string
  count?: number
  color?: string // "r, g, b"
}

type Mote = { x: number; y: number; r: number; vy: number; vx: number; phase: number; speed: number }

/**
 * Drifting, twinkling motes ("floating candle dust") on a canvas.
 * Pauses off-screen and renders nothing for reduced-motion users.
 */
export default function Sparkles({ className, count = 46, color = '246, 238, 216' }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = 0
    let h = 0
    let raf = 0
    let visible = true
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let motes: Mote[] = []

    const spawn = (anywhere: boolean): Mote => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 10,
      r: 0.6 + Math.random() * 1.8,
      vy: 0.12 + Math.random() * 0.35,
      vx: (Math.random() - 0.5) * 0.15,
      phase: Math.random() * Math.PI * 2,
      speed: 0.6 + Math.random() * 1.4,
    })

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      w = rect.width
      h = rect.height
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      motes = Array.from({ length: count }, () => spawn(true))
    }

    const tick = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      for (const m of motes) {
        m.y -= m.vy
        m.x += m.vx + Math.sin(t / 1800 + m.phase) * 0.12
        if (m.y < -10) Object.assign(m, spawn(false))
        const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(t / 1000 * m.speed + m.phase))
        const alpha = twinkle * Math.min(1, m.y / (h * 0.25)) * 0.8
        const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 4)
        g.addColorStop(0, `rgba(${color}, ${alpha})`)
        g.addColorStop(1, `rgba(${color}, 0)`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(m.x, m.y, m.r * 4, 0, Math.PI * 2)
        ctx.fill()
      }
      if (visible) raf = requestAnimationFrame(tick)
    }

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      cancelAnimationFrame(raf)
      if (visible) raf = requestAnimationFrame(tick)
    })

    resize()
    io.observe(canvas)
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('resize', resize)
    }
  }, [count, color])

  return <canvas ref={ref} className={className} aria-hidden="true" />
}
