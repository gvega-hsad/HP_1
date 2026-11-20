import { useEffect, useRef } from 'react'
import LoopingVideo from '../components/LoopingVideo'
import './MagicWords.css'

const A = '/assets'

const steps = [
  {
    n: 1,
    title: 'Wield your Magic Remote',
    body: 'Any LG TV running webOS 25 or later will do. Make sure you’re signed in to your LG account.',
  },
  {
    n: 2,
    title: 'Hold down the mic button',
    body: 'Speak the words, “Ready for Hogwarts.” In a British accent, if you prefer.',
  },
  {
    n: 3,
    title: 'Watch your TV transform',
    body: 'Your home screen displays a Harry Potter theme with Gallery+ art at the ready.',
  },
]

const FORM_MS = 4200 // keep in sync with --t in MagicWords.css

/**
 * Smoke materialisation for the parchment (as on HP_2's webOS cards): an SVG turbulence
 * filter whose displacement and blur dissolve to zero while the paper fades in, so it
 * condenses out of smoke. Only the paper layer is filtered, never the steps' text.
 * Starts when the paper's reveal fires (.is-in); removed once settled so it renders
 * crisp. Re-arms with the reveal, so it plays on every downward pass.
 */
function useSmokeMaterialise(paper: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = paper.current
    const layer = root?.querySelector<HTMLElement>('.magic__parchment')
    if (!root || !layer) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let timer = 0
    let on = false
    const sync = () => {
      const isIn = root.classList.contains('is-in')
      if (isIn === on) return
      on = isIn
      window.clearTimeout(timer)
      layer.style.filter = isIn ? 'url(#magic-smoke)' : ''
      if (!isIn) return
      document
        .getElementById('magic-smoke')
        ?.querySelectorAll('animate')
        .forEach((a) => (a as SVGAnimateElement).beginElement())
      timer = window.setTimeout(() => (layer.style.filter = ''), FORM_MS + 80)
    }
    const mo = new MutationObserver(sync)
    mo.observe(root, { attributes: true, attributeFilter: ['class'] })
    sync()
    return () => {
      mo.disconnect()
      window.clearTimeout(timer)
    }
  }, [paper])
}

export default function MagicWords() {
  const paper = useRef<HTMLDivElement>(null)
  useSmokeMaterialise(paper)

  return (
    <section className="magic" data-section="magic-words">
      <svg className="magic__defs" aria-hidden="true" focusable="false">
        <filter id="magic-smoke" x="-20%" y="-60%" width="140%" height="220%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="3" seed="11" result="noise">
            <animate attributeName="baseFrequency" begin="indefinite" dur="4.2s" values="0.012 0.03;0.004 0.01" fill="freeze" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" result="wisp">
            <animate
              attributeName="scale"
              begin="indefinite"
              dur="4s"
              values="200;0"
              keyTimes="0;1"
              calcMode="spline"
              keySplines="0.45 0 0.55 1"
              fill="freeze"
            />
          </feDisplacementMap>
          <feGaussianBlur in="wisp" stdDeviation="0">
            <animate
              attributeName="stdDeviation"
              begin="indefinite"
              dur="3.6s"
              values="14;0"
              keyTimes="0;1"
              calcMode="spline"
              keySplines="0.45 0 0.55 1"
              fill="freeze"
            />
          </feGaussianBlur>
        </filter>
      </svg>
      <div className="magic__inner">
        <div className="magic__row">
          <LoopingVideo
            className="magic__media reveal"
            src={`${A}/hp-teaser.mp4`}
            poster={`${A}/magic-poster.jpg`}
            label="Ollivander in the HBO series"
          />
          <div className="magic__text">
            <p className="overline reveal" style={{ '--d': 1 } as React.CSSProperties}>only on webos</p>
            <h2 className="t3 reveal" style={{ '--d': 2 } as React.CSSProperties}>Say the magic words</h2>
            <p className="body-2 reveal" style={{ '--d': 3 } as React.CSSProperties}>
              A spoken charm turns your LG TV into your own Platform 9¾. No wand necessary, just your Magic Remote.
            </p>
          </div>
        </div>

        {/* the parchment materialises out of smoke; then the steps fade in on it one at a time */}
        <div ref={paper} className="magic__paper reveal" data-reveal-early data-reveal-lead="1.2">
          {/* feathered while it materialises, so the paper's edges stay soft until it's done */}
          <div className="magic__feather" aria-hidden="true">
            <div className="magic__parchment" />
          </div>
          <span className="magic__smoke" aria-hidden="true">
            {Array.from({ length: 8 }, (_, k) => (
              <i key={k} />
            ))}
          </span>
          <span className="magic__sparks" aria-hidden="true">
            {Array.from({ length: 14 }, (_, k) => (
              <b key={k} />
            ))}
          </span>
          <ol className="magic__steps">
            {steps.map((s, i) => (
              <li className="magic__step" key={s.n} style={{ '--i': i } as React.CSSProperties}>
                <span className="magic__num font-jazmin" aria-hidden="true">{s.n}</span>
                <h3 className="subtitle-2">
                  <span className="visually-hidden">Step {s.n}: </span>
                  {s.title}
                </h3>
                <p className="body-2">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
