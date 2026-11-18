import { useEffect, useRef } from 'react'
import './Collection.css'

const A = '/assets'

/** Collage tiles in Figma px on the 1600 frame (scaled to the window via --u):
 *  each tile is a crop window around its still. */
export const tiles = [
  { // cloister
    win: { x: -151.32, y: 112.62, w: 497.76, h: 282.27 },
    img: { src: 'portrait1.jpg', x: 81.3, y: -1, w: 432, h: 288 },
    alt: 'Harry, Ron and Hermione in a Hogwarts cloister',
  },
  { // great hall
    win: { x: 363.64, y: 181.42, w: 374.33, h: 211.45 },
    img: { src: 'portrait4.jpg', x: -10.67, y: -5.8, w: 394, h: 222 },
    alt: 'The Great Hall during the Sorting',
  },
  { // family dinner
    win: { x: -203.02, y: 415.62, w: 509.9, h: 286.32 },
    img: { src: 'portrait3.jpg', x: 170, y: -6, w: 528, h: 298 },
    alt: 'The Weasley family at the dinner table',
  },
  { // mcgonagall — the scene pushes into this one (see SortingHouses)
    win: { x: 325.78, y: 415.12, w: 451.22, h: 254.95 },
    img: { src: 'portrait2.jpg', x: -5.8, y: -6.5, w: 483, h: 272 },
    alt: 'Professor McGonagall reading names in the Great Hall',
  },
]

/** Figma px → window-relative length */
const u = (n: number) => `calc(var(--u) * ${n})`

/**
 * Narrow screens: the stills are sticky (CSS), so each one slides up over the one
 * before and they pile into a stack. As a still is covered, it recedes — scales
 * down a touch and dims — in step with the next one arriving.
 */
const GROW_DIST = 480 // scroll px for it to grow
const GROW_HOLD = 60 // then it holds, full size, this long before the section lets go
const GROW_H = 600 // its final height = the Sorting Hat backdrop on narrow screens
const NAV_H = 68

function useStackedStills(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current
    if (!el) return
    const narrow = window.matchMedia('(max-width: 1240px)')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const tiles = Array.from(el.querySelectorAll<HTMLElement>('.collection__tile'))
    let raf = 0
    let active = true // stacked-layout styles may be applied (cleared once when leaving)

    const last = tiles[tiles.length - 1]
    const portraits = el.querySelector<HTMLElement>('.collection__portraits')!
    const spacer = el.querySelector<HTMLElement>('.collection__stack-end')!

    const sortingParts = () =>
      Array.from(document.querySelectorAll<HTMLElement>('.scene:not(.scene--on) .sorting__bg-win, .scene:not(.scene--on) .sorting__shade'))

    const clear = () => {
      tiles.forEach((t) => {
        t.style.scale = ''
        t.style.filter = ''
        t.style.visibility = ''
      })
      ;['--grow', '--grow-y', '--grow-w', '--grow-h', '--grow-l'].forEach((v) => last.style.removeProperty(v))
      last.style.visibility = ''
      document.querySelectorAll<HTMLElement>('.sorting__bg-win, .sorting__shade').forEach((n) => (n.style.visibility = ''))
    }

    /**
     * The last still (McGonagall) grows, once it has stacked, from its card to the full
     * width at 600px tall under the nav: exactly where the Sorting Hat backdrop sits when
     * this section lets go. The backdrop (pulled up under it in CSS) is revealed at that
     * moment, so the photo carries straight on into the next section.
     */
    const grow = () => {
      const cs = getComputedStyle(portraits)
      const gap = parseFloat(cs.rowGap) || 0
      const before = tiles.slice(0, -1).reduce((sum, t) => sum + t.offsetHeight + gap, 0)
      const naturalTop = portraits.getBoundingClientRect().top + parseFloat(cs.paddingTop) + before
      const W = document.documentElement.clientWidth
      const baseW = portraits.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      const baseL = portraits.getBoundingClientRect().left + parseFloat(cs.paddingLeft)
      // No overlap for the last still: it stops just below the pile (where it would
      // start to slide over the third still) and zooms from there.
      const prev = tiles[tiles.length - 2]
      const start = (parseFloat(getComputedStyle(prev).top) || 0) + prev.offsetHeight + gap
      const q0 = Math.min(1, Math.max(0, (start - naturalTop) / GROW_DIST))
      const q = q0 < 0.5 ? 2 * q0 * q0 : 1 - Math.pow(-2 * q0 + 2, 2) / 2 // ease in-out
      last.style.setProperty('--grow', `${q}`)
      last.style.setProperty('--grow-y', `${start + (NAV_H - start) * q}px`)
      last.style.setProperty('--grow-w', `${(W - baseW) * q}px`)
      last.style.setProperty('--grow-l', `${baseL * q}px`)
      const h0 = (baseW * 9) / 16
      const h = h0 + (GROW_H - h0) * q
      last.style.setProperty('--grow-h', `${h}px`)
      // Keep the page height constant while the still grows (no scroll-anchoring jumps):
      // the spacer gives back what the still takes, and is sized so the section lets go
      // just after the still reaches full size.
      const releaseTop = start - GROW_DIST - GROW_HOLD // still's natural top at release
      const spacerH = NAV_H + GROW_H - releaseTop - h0 - gap
      spacer.style.height = `${spacerH - (h - h0)}px`
      // released = the section has let go of the grown still; hand over to the backdrop
      const released = spacer.getBoundingClientRect().bottom <= last.getBoundingClientRect().bottom + 1
      sortingParts().forEach((n) => (n.style.visibility = released ? '' : 'hidden'))
      last.style.visibility = released ? 'hidden' : '' // the backdrop (identical) takes over
      // once the grown still covers the pile, the stills beneath it are done
      tiles.slice(0, -1).forEach((t) => (t.style.visibility = q >= 0.999 ? 'hidden' : ''))
    }

    const update = () => {
      raf = 0
      if (!narrow.matches || reduce.matches) {
        // Clear our inline styles once when leaving the stacked layout, then stay out
        // of the way: on desktop the Sorting Hat scene owns the McGonagall tile's
        // visibility, and resetting it on every scroll made the tile flash back in
        // its old spot mid-transition.
        if (active) {
          active = false
          clear()
        }
        return
      }
      active = true
      grow()
      // the pile (all but the last still, which zooms instead of stacking)
      const pile = tiles.slice(0, -1)
      pile.forEach((t, i) => {
        const next = pile[i + 1]
        if (!next) return
        // how far the next still has travelled over this one (0 → 1)
        const stick = parseFloat(getComputedStyle(next).top) || 0
        const r = next.getBoundingClientRect()
        const p = Math.min(1, Math.max(0, 1 - (r.top - stick) / r.height))
        // deeper in the pile = a little smaller and darker
        const depth = pile.slice(i + 1).reduce((sum, n) => {
          const nr = n.getBoundingClientRect()
          const ns = parseFloat(getComputedStyle(n).top) || 0
          return sum + Math.min(1, Math.max(0, 1 - (nr.top - ns) / nr.height))
        }, 0)
        t.style.scale = `${1 - 0.05 * depth}`
        t.style.filter = `brightness(${1 - 0.28 * Math.min(1, p) - 0.1 * Math.max(0, depth - 1)})`
      })
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      clear()
    }
  }, [root])
}

export default function Collection() {
  const section = useRef<HTMLElement>(null)
  useStackedStills(section)
  return (
    <section className="collection" data-section="collection" ref={section}>
      <div className="collection__band" aria-hidden="true">
        <img className="collection__photo" src={`${A}/collection-bg.png`} alt="" />
      </div>

      <div className="collection__portraits">
        {tiles.map((t, n) => (
          <figure
            key={t.img.src}
            className={`collection__tile reveal${n === 3 ? ' collection__tile--push' : ''}`}
            style={{ left: u(t.win.x), top: u(t.win.y), width: u(t.win.w), height: u(t.win.h), '--d': n } as React.CSSProperties}
          >
            <img
              src={`${A}/${t.img.src}`}
              alt={t.alt}
              style={{ left: u(t.img.x), top: u(t.img.y), width: u(t.img.w), height: u(t.img.h) }}
            />
          </figure>
        ))}
        {/* narrow screens: scroll room for the last still to grow into the Sorting Hat backdrop */}
        <div className="collection__stack-end" aria-hidden="true" />
      </div>

      <div className="collection__content">
        <div className="collection__text">
          <p className="overline reveal" style={{ '--d': 1 } as React.CSSProperties}>harry potter on lg gallery+</p>
          <h2 className="t3 reveal" style={{ '--d': 2 } as React.CSSProperties}>Put the Wizarding World on display</h2>
          <p className="body-2 reveal" style={{ '--d': 3 } as React.CSSProperties}>
            Keep the magic going after you watch the show. The Harry Potter Collection on LG Gallery+ fills your TV
            with portraits, places and moments from the story.
          </p>
        </div>
        <div className="reveal" style={{ '--d': 4 } as React.CSSProperties}>
          <a className="btn btn--secondary" href="#">See the Collection</a>
        </div>
      </div>
    </section>
  )
}
