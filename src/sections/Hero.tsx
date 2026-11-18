import { useEffect, useRef, useState } from 'react'
import Sparkles from '../components/Sparkles'
import useSmokeLogo from '../components/useSmokeLogo'
import VideoModal from '../components/VideoModal'
import './Hero.css'

const A = '/assets'
const LOCKUP_DELAY_MS = 2600 // after the copy has mostly settled

/** Sets --sy (0 → 1 as the hero scrolls out of view) for scroll parallax. */
function useScrollProgress(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let cur = 0
    let raf = 0
    const tick = () => {
      const r = el.getBoundingClientRect()
      const s = Math.min(1, Math.max(0, -r.top / r.height))
      cur += (s - cur) * 0.2
      el.style.setProperty('--sy', cur.toFixed(4))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [ref])
}

/**
 * Smoke reveal: an SVG turbulence filter whose displacement and blur dissolve
 * to zero while the element fades in. The filter is removed once settled so
 * the logo renders crisp.
 */
function useSmoke(filter: React.RefObject<SVGFilterElement | null>, delayMs: number) {
  const [state, setState] = useState<'waiting' | 'forming' | 'settled'>('waiting')
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setState('settled')
      return
    }
    const start = window.setTimeout(() => {
      filter.current?.querySelectorAll('animate').forEach((a) => (a as SVGAnimateElement).beginElement())
      setState('forming')
    }, delayMs)
    const end = window.setTimeout(() => setState('settled'), delayMs + 4200)
    return () => {
      window.clearTimeout(start)
      window.clearTimeout(end)
    }
  }, [filter, delayMs])
  return state
}

export default function Hero() {
  const section = useRef<HTMLElement>(null)
  const smoke = useRef<SVGFilterElement>(null)
  const lockup = useRef<HTMLDivElement>(null)
  const smokeCanvas = useRef<HTMLCanvasElement>(null)
  const [teaserOpen, setTeaserOpen] = useState(false)
  useScrollProgress(section)
  const lockupState = useSmoke(smoke, LOCKUP_DELAY_MS)
  // Hover the lockup → it turns to smoke you can push around; it reforms when you move away.
  useSmokeLogo({ hero: section, logo: lockup, canvas: smokeCanvas, enabled: lockupState === 'settled' })

  return (
    <section className="hero" data-section="hero" ref={section}>
      <svg className="hero__defs" aria-hidden="true" focusable="false">
        <filter id="hero-smoke" ref={smoke} x="-40%" y="-120%" width="180%" height="340%">
          <feTurbulence type="fractalNoise" baseFrequency="0.022 0.04" numOctaves="3" seed="11" result="noise">
            <animate attributeName="baseFrequency" begin="indefinite" dur="4s" values="0.022 0.04;0.006 0.012" fill="freeze" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="160" xChannelSelector="R" yChannelSelector="G" result="wisp">
            <animate
              attributeName="scale"
              begin="indefinite"
              dur="4s"
              values="160;0"
              keyTimes="0;1"
              calcMode="spline"
              keySplines="0.25 0.6 0.2 1"
              fill="freeze"
            />
          </feDisplacementMap>
          <feGaussianBlur in="wisp" stdDeviation="12">
            <animate
              attributeName="stdDeviation"
              begin="indefinite"
              dur="3.4s"
              values="12;0"
              keyTimes="0;1"
              calcMode="spline"
              keySplines="0.3 0.5 0.2 1"
              fill="freeze"
            />
          </feGaussianBlur>
        </filter>
      </svg>

      <div className="hero__bg" aria-hidden="true">
        {/* Hogwarts Express photo spans the full window width */}
        <div className="hero__photo">
          <div className="hero__photo-inner">
            <img src={`${A}/hero1-train.jpg`} alt="" />
            <span className="hero__headlight" />
          </div>
        </div>
        <div className="hero__shade" />
        <img className="hero__seal" src={`${A}/hero1-seal.svg`} alt="" width={942.644} height={866.094} />
        <Sparkles className="hero__sparkles" />
      </div>

      <canvas ref={smokeCanvas} className="hero__lockup-canvas" aria-hidden="true" />
      <div ref={lockup} className={`hero__lockup is-${lockupState}`} aria-label="Harry Potter × LG">
        <span className="hero__lockup-smoke" aria-hidden="true" />
        <img src={`${A}/lockup-hp.svg`} alt="" width={130.826} height={53.1305} />
        <span
          className="hero__lockup-lg"
          style={{ maskImage: `url(${A}/lockup-lg-mask.svg)`, WebkitMaskImage: `url(${A}/lockup-lg-mask.svg)` }}
        >
          <img src={`${A}/lockup-lg.svg`} alt="" width={384.13} height={40.447} />
        </span>
      </div>

      <div className="hero__content">
        <div className="hero__text">
          <p className="overline hero-reveal" style={{ '--d': 0 } as React.CSSProperties}>
            harry potter and the philosopher’s stone
          </p>
          <h1 className="t3 hero__title hero-reveal" style={{ '--d': 1 } as React.CSSProperties}>
            Hogwarts opens early on your LG TV
          </h1>
          <p className="body-2 hero-reveal" style={{ '--d': 2 } as React.CSSProperties}>
            No need to wait for your letter when you have an LG TV. Unlock a Wizarding World theme, Gallery+ art and
            more on webOS today. Then get ready to settle in on December 25 to watch the series premiere on HBO Max.
          </p>
        </div>
        <div className="hero__actions hero-reveal" style={{ '--d': 3 } as React.CSSProperties}>
          <button className="btn btn--secondary hero__cta" type="button" onClick={() => setTeaserOpen(true)}>
            <svg className="hero__cta-icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" fill="currentColor" />
            </svg>
            Watch Teaser
          </button>
          <a className="btn btn--text hero__link" href="#">Unlock it on WebOS</a>
        </div>
      </div>

      <VideoModal
        open={teaserOpen}
        onClose={() => setTeaserOpen(false)}
        src={`${A}/hp-teaser-trailer.mp4`}
        poster={`${A}/harry-preview.jpg`}
        title="Harry Potter series teaser"
      />
    </section>
  )
}
