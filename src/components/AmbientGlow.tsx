import { useEffect, useRef } from 'react'

type Props = {
  /** Element that contains the <video> to sample. */
  source: React.RefObject<HTMLElement | null>
  className?: string
}

/**
 * Ambient light: paints a tiny, heavily blurred copy of the playing video
 * behind it, so the screen's colours spill onto the page — like a TV's
 * bias lighting. Samples ~15×/s at 32×18px, so it's cheap. Runs only while
 * on screen; reduced-motion users get a single static frame.
 */
export default function AmbientGlow({ source, className }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = canvas.current
    const video = source.current?.querySelector('video')
    if (!c || !video) return
    const ctx = c.getContext('2d', { willReadFrequently: false })
    if (!ctx) return
    c.width = 32
    c.height = 18

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let timer = 0
    let visible = false

    const paint = () => {
      if (video.readyState >= 2) ctx.drawImage(video, 0, 0, c.width, c.height)
    }
    const loop = () => {
      paint()
      if (visible && !reduce) timer = window.setTimeout(loop, 66)
    }

    const poster = new Image()
    poster.src = video.poster
    poster.onload = () => {
      if (video.readyState < 2) ctx.drawImage(poster, 0, 0, c.width, c.height)
    }

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      window.clearTimeout(timer)
      if (visible) loop()
    })
    io.observe(c)
    video.addEventListener('loadeddata', paint)
    return () => {
      io.disconnect()
      window.clearTimeout(timer)
      video.removeEventListener('loadeddata', paint)
    }
  }, [source])

  return <canvas ref={canvas} className={className} aria-hidden="true" />
}
