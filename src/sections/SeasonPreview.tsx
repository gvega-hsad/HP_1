import { useEffect, useRef, useState } from 'react'
import AmbientGlow from '../components/AmbientGlow'
import LoopingVideo from '../components/LoopingVideo'
import './SeasonPreview.css'

const A = '/assets'

function AddToCart() {
  const [added, setAdded] = useState(false)
  useEffect(() => {
    if (!added) return
    const t = window.setTimeout(() => setAdded(false), 2600)
    return () => window.clearTimeout(t)
  }, [added])

  return (
    <button className={`btn btn--secondary atc${added ? ' is-added' : ''}`} type="button" onClick={() => setAdded(true)}>
      <span className="atc__label">Add to Cart</span>
      <span className="atc__done" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path className="atc__check" d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Added
      </span>
      <span className="visually-hidden" aria-live="polite">{added ? 'Added to cart' : ''}</span>
    </button>
  )
}

export default function SeasonPreview() {
  const videoBox = useRef<HTMLDivElement>(null)
  const screen = useRef<HTMLDivElement>(null)
  const card = useRef<HTMLElement>(null)

  // The product card waits until the video has finished opening to full size
  // (screen reveal + 0.25s delay + 1.6s clip-path), then rises in like the rest.
  // Re-armed whenever the screen resets, so it replays on every downward pass.
  useEffect(() => {
    const el = screen.current
    const c = card.current
    if (!el || !c) return
    let timer = 0
    const sync = () => {
      window.clearTimeout(timer)
      if (el.classList.contains('is-in')) {
        timer = window.setTimeout(() => c.classList.add('is-ready'), 1850)
      } else {
        c.classList.remove('is-ready')
      }
    }
    let was = el.classList.contains('is-in')
    if (was) sync()
    const mo = new MutationObserver(() => {
      const now = el.classList.contains('is-in')
      if (now !== was) {
        was = now
        sync()
      }
    })
    mo.observe(el, { attributes: true, attributeFilter: ['class'] })
    return () => {
      mo.disconnect()
      window.clearTimeout(timer)
    }
  }, [])

  return (
    <section className="season" data-section="season-preview">
      <div className="container season__inner">
        <header className="section-header">
          <p className="overline reveal" style={{ '--d': 0 } as React.CSSProperties}>Season one preview</p>
          <h2 className="t3 reveal" style={{ '--d': 1 } as React.CSSProperties}>Harry’s first year begins</h2>
          <p className="body-2 reveal" style={{ '--d': 2 } as React.CSSProperties}>
            HBO’s new series brings each book to the screen in turn. It opens with Harry’s journey from the cupboard
            under the stairs to the Great Hall and beyond.
          </p>
        </header>

        {/* Video "screen": rises in, then opens from a narrower window to full
            width, and casts its colours onto the page behind it. */}
        <div ref={screen} className="season__screen reveal">
          <AmbientGlow source={videoBox} className="season__glow" />
          <div ref={videoBox} className="season__media">
            <LoopingVideo
              className="season__video"
              src={`${A}/hp-teaser-trailer.mp4`}
              poster={`${A}/harry-preview.jpg`}
              label="Season one preview: Harry Potter in the HBO series"
              soundToggle
            />
          </div>
        </div>

        <article ref={card} className="product-compact reveal">
          <div className="product-compact__image">
            <img src={`${A}/tv-oled-w6.png`} alt='77" LG OLED evo AI W6 Wallpaper TV' />
          </div>
          <div className="product-compact__body">
            <p className="overline overline--lg">OLED77W6PUA</p>
            <p className="subtitle-3 product-compact__desc">
              The 77" Class LG OLED evo AI W6 Wallpaper TV reveals the secrets of Hogwarts in Perfect Black, Perfect
              Color and Reflection Free viewing. It’s just 9.9mm thin and connects with True Wireless, as if by magic!
            </p>
            <AddToCart />
          </div>
        </article>
      </div>
    </section>
  )
}
