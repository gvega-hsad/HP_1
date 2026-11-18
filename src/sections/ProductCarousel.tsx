import { useEffect, useRef, useState } from 'react'
import './ProductCarousel.css'

const A = '/assets'

type Product = {
  model: string
  name: string
  image?: string
  features: string[]
  brand?: boolean // Harry Potter typography (real products) vs. LG placeholder
}

const products: Product[] = [
  {
    model: 'OLED77W6PUA',
    name: '77" LG OLED evo AI W6 Wallpaper TV',
    image: `${A}/product-oled-w6.png`,
    brand: true,
    features: [
      'Ultra-thin 9.9mm Wallpaper Design with flush wall mount',
      'True Wireless 4K video and audio',
      'Hyper Radiant Color Technology',
      'LG Gallery+ ready for art between episodes',
    ],
  },
  {
    model: '65LX7BPUA',
    name: '65" LG Gallery TV with Frame',
    image: `${A}/product-gallery-tv.png`,
    brand: true,
    features: [
      'Attachable magnetic frame (snow white included)',
      'Mini LED with Dynamic QNED Color',
      'Matte display that helps cut down glare',
      'Designed for LG Gallery+',
    ],
  },
  {
    model: 'LOREM00IPSUM',
    name: 'Lorem ipsum dolor sit amet',
    features: ['Consectetur adipiscing elit', 'Sed do eiusmod tempor', 'Ut labore et dolore magna', 'Quis nostrud exercitation'],
  },
  {
    model: 'LOREM00DOLOR',
    name: 'Lorem ipsum dolor sit amet',
    features: ['Consectetur adipiscing elit', 'Sed do eiusmod tempor', 'Ut labore et dolore magna', 'Quis nostrud exercitation'],
  },
]

const CARD_GAP = 18
/** one card + gap, measured (cards are narrower on phones) */
const cardStep = (track: HTMLElement) =>
  ((track.querySelector<HTMLElement>('.product-card')?.offsetWidth ?? 400) + CARD_GAP)

export default function ProductCarousel() {
  const track = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)
  const [pages, setPages] = useState(1)

  useEffect(() => {
    const el = track.current
    if (!el) return
    const measure = () => {
      const max = el.scrollWidth - el.clientWidth
      const step = cardStep(el)
      setPages(Math.min(products.length, Math.max(1, Math.ceil(max / step) + 1)))
      setPage(Math.round(el.scrollLeft / step))
    }
    measure()
    el.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      el.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [])

  // Cards sweep in from the right; scroll-snap would latch onto them mid-flight,
  // so it's switched on only once the entrance has finished — and off again when
  // the row resets for a replay (see useRevealOnScroll).
  useEffect(() => {
    const el = track.current
    if (!el) return
    let timer = 0
    const sync = () => {
      window.clearTimeout(timer)
      if (el.classList.contains('is-in')) {
        timer = window.setTimeout(() => {
          el.scrollLeft = 0
          el.classList.add('is-settled')
        }, 2600)
      } else {
        el.classList.remove('is-settled')
        el.scrollLeft = 0
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

  const go = (i: number) => {
    const el = track.current
    if (!el) return
    const next = Math.max(0, Math.min(pages - 1, i))
    el.scrollTo({ left: next * cardStep(el), behavior: 'smooth' })
  }

  return (
    <section className="products" data-section="product-carousel">
      <header className="section-header products__header">
        <h2 className="t3 font-jazmin reveal" style={{ '--d': 0 } as React.CSSProperties}>Bring home the LG magic</h2>
        <p className="body-2 font-goudy reveal" style={{ '--d': 1 } as React.CSSProperties}>There’s an LG TV destined for you, ready for season one and every season to come.</p>
      </header>

      <div className="products__track reveal-group" ref={track}>
        {products.map((p, i) => (
          <article className="product-card reveal" key={`${p.model}-${i}`} style={{ '--d': Math.min(i, 4) + 1 } as React.CSSProperties}>
            <div className={`product-card__image${p.image ? '' : ' is-empty'}`}>
              {p.image && <img src={p.image} alt={p.name} />}
            </div>
            <div className="product-card__body">
              <div className="product-card__title">
                <p className="overline overline--lg product-card__model">{p.model}</p>
                <h3 className={`subtitle-3 product-card__name${p.brand ? ' font-goudy-bold' : ''}`}>{p.name}</h3>
              </div>
              <ul className="product-card__features">
                {p.features.map((f, j) => (
                  <li key={j}>{f}</li>
                ))}
              </ul>
              <a className="btn btn--secondary product-card__cta" href="#">Shop Now</a>
            </div>
          </article>
        ))}
      </div>

      <div className="products__stepper reveal" style={{ '--d': 3 } as React.CSSProperties}>
        <button type="button" aria-label="Previous products" onClick={() => go(page - 1)} disabled={page === 0}>
          <img src={`${A}/icon-arrow-back.svg`} alt="" width={24} height={24} />
        </button>
        <div className="products__dots">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              className={i === page ? 'is-active' : ''}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => go(i)}
            />
          ))}
        </div>
        <button type="button" aria-label="Next products" onClick={() => go(page + 1)} disabled={page >= pages - 1}>
          <img src={`${A}/icon-arrow-forward.svg`} alt="" width={24} height={24} />
        </button>
      </div>
    </section>
  )
}
