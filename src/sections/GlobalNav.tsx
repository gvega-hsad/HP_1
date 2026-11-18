import { useEffect, useState } from 'react'
import './GlobalNav.css'

const A = '/assets'

/* Mirrors the live www.lg.com/us header (Nov 2026): dark promo ticker, then a
   sand header with logo / ZIP / search / account / cart and a centered
   category row. */

const promos = [
  { text: 'Black Friday Price Guaranteed on select LG TVs', cta: 'Shop Now' },
  { text: 'Shop top deals on select home appliances', cta: 'Shop Now' },
]

const categories = ['Offers', 'Appliances', 'TV & Audio', 'Monitors & Laptops', 'Smart Home']
const categoriesAfter = ['Accessories & Parts', 'Support']

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d={dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function GlobalNav() {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const t = window.setInterval(() => setI((n) => (n + 1) % promos.length), 6000)
    return () => window.clearInterval(t)
  }, [paused])

  const go = (d: number) => setI((n) => (n + d + promos.length) % promos.length)

  return (
    <header className="gnb" data-section="gnb">
      <div
        className="gnb__promo"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        aria-roledescription="carousel"
        aria-label="Promotions"
      >
        <div className="gnb__promo-track" aria-live="polite">
          {promos.map((p, n) => (
            <p key={p.text} className={`gnb__promo-msg${n === i ? ' is-active' : ''}`} aria-hidden={n !== i}>
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path
                  d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9z M7.5 7.5h.01"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
              {p.text}
              <a href="#" tabIndex={n === i ? 0 : -1}>{p.cta}</a>
            </p>
          ))}
        </div>
        <div className="gnb__promo-controls">
          <button type="button" aria-label="Previous promotion" onClick={() => go(-1)}>
            <Chevron dir="left" />
          </button>
          <span>
            {i + 1}/{promos.length}
          </span>
          <button type="button" aria-label="Next promotion" onClick={() => go(1)}>
            <Chevron dir="right" />
          </button>
        </div>
      </div>

      <div className="gnb__main">
        <a className="gnb__business" href="#">
          Business
          <svg viewBox="0 0 24 24" width="10" height="10" aria-hidden="true">
            <path d="M7 17L17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </a>

        <div className="gnb__row">
          <a className="gnb__logo" href="#" aria-label="LG home">
            <img src={`${A}/lg-logo.svg`} alt="LG" width={68} height={30} />
          </a>

          <div className="gnb__center">
            <a className="gnb__zip" href="#" aria-label="Delivery ZIP code 07094">
              <img src={`${A}/icon-shipping.svg`} alt="" width={24} height={24} />
              <span>07094</span>
            </a>
            <form className="gnb__search" role="search" onSubmit={(e) => e.preventDefault()}>
              <img src={`${A}/icon-search.svg`} alt="" width={28} height={28} />
              <input type="search" placeholder="Search LG" aria-label="Search LG" />
            </form>
          </div>

          <div className="gnb__icons">
            <a href="#" aria-label="Account Info">
              <img src={`${A}/icon-person.svg`} alt="" width={24} height={24} />
            </a>
            <a href="#" aria-label="Cart, 0 items">
              <img src={`${A}/icon-cart.svg`} alt="" width={24} height={24} />
            </a>
          </div>
        </div>

        <nav className="gnb__nav" aria-label="Product categories">
          {categories.map((c) => (
            <a key={c} className="gnb__cat" href="#">{c}</a>
          ))}
          <a className="gnb__cat gnb__cat--signature" href="#" aria-label="LG Signature">
            <img src={`${A}/lg-signature-nav.png`} alt="" width={136} height={20} />
          </a>
          <span className="gnb__divider" aria-hidden="true" />
          {categoriesAfter.map((c) => (
            <a key={c} className="gnb__cat" href="#">{c}</a>
          ))}
        </nav>
      </div>
    </header>
  )
}
