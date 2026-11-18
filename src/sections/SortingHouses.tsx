import { useEffect, useRef } from 'react'
import Collection, { tiles } from './Collection'
import './SortingHouses.css'

const A = '/assets'

const houses = [
  {
    name: 'Ravenclaw',
    banner: `${A}/banner-ravenclaw.png`,
    wallpaper: `${A}/house-ravenclaw.jpg`,
    body: 'Curious, clever and always one chapter ahead, Ravenclaws prize wit, wisdom and an original idea. Notable members: Filius Flitwick, Quirinus Quirrell, Terry Boot.',
  },
  {
    name: 'Slytherin',
    banner: `${A}/banner-slytherin.png`,
    wallpaper: `${A}/house-slytherin.jpg`,
    body: 'Ambitious, resourceful and determined to win, Slytherins know exactly what they want and how to get it. Notable members: Severus Snape, Draco Malfoy, Vincent Crabbe, Gregory Goyle.',
  },
  {
    name: 'Gryffindor',
    banner: `${A}/banner-gryffindor.png`,
    wallpaper: `${A}/house-gryffindor.jpg`,
    body: 'Bold, daring and never one to back down from trouble, Gryffindors lead with nerve and a strong sense of right. Notable members: Harry Potter, Hermione Granger, Ron Weasley.',
  },
  {
    name: 'Hufflepuff',
    banner: `${A}/banner-hufflepuff.png`,
    wallpaper: `${A}/house-hufflepuff.jpg`,
    body: 'Loyal, patient and fair to the core, Hufflepuffs are the friends who show up, work hard and never ask for credit. Notable members: Hannah Abbott, Justin Finch-Fletchley, the Fat Friar.',
  },
]

// ---------- Scene geometry (Figma px) ----------
const NAV_H = 68 // sticky "Harry Potter on webOS" bar
const GRID_GAP = 40 // stacked .sorting row gap (SortingHouses.css)
const DEVICE_W = 632 // QR card + accent + phone group, Figma px (x 119 → 751)
const BLOCK_TOP = 64 // copy + QR card block in the comp (Figma px): top …
const BLOCK_H = 677 //   … and height; it's centred in the visible area (the phone follows)
const PHONE_BOTTOM = 408 + 552.909 // phone top + height in the comp (before --lshift)
const FIT_H = 800 // the comp scales down when the visible area is shorter than this
const IMG_W = 1350
const IMG_H = 760
// McGonagall tile in Collection (Figma px on the 1600 frame; scaled by W / 1600)
const TILE = tiles[3].win
const TILE_IMG = tiles[3].img
const PANEL_H = 1072 // parchment houses panel (Figma 693×1072 at x 783)
const RAIL_PAD = 64 // breathing room above/below the panel inside the rail window

// Scroll budget per phase (px)
const MORPH = 1500 // the McGonagall image grows from its tile straight into the backdrop
const ARRIVE = 400 // a beat with the left column in place before the houses panel moves
const HOLD = 220
const LEAVE_GAP = 320 // scrolling up: the left column fades out this far before the photo moves
const END_HOLD = 260

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) // easeInOutCubic
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * One pinned scene from Gallery+ through the houses:
 *  1. morph  — in one continuous move, the McGonagall image grows out of its tile into its
 *              backdrop framing while the gradient comes up over it; the rest of Gallery+
 *              fades and drifts up. Copy, QR and phone arrive as it lands.
 *  2. arrive — a short pause with the copy, QR and phone in place (no houses yet)
 *  3. rail   — everything holds still while the houses panel rises on the right
 *  4. release — the pin lets go and the whole scene scrolls up into the carousel
 * Below 1241px or with reduced motion, the sections simply stack.
 */
function useScene(scene: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = scene.current
    if (!root) return
    const pin = root.querySelector<HTMLElement>('.scene__pin')!
    const collection = root.querySelector<HTMLElement>('.collection')!
    const bg = root.querySelector<HTMLElement>('.sorting__bg')!
    const bgWin = root.querySelector<HTMLElement>('.sorting__bg-win')!
    const tile = root.querySelector<HTMLElement>('.collection__tile--push')!
    const shade = root.querySelector<HTMLElement>('.sorting__shade')!
    const railWin = root.querySelector<HTMLElement>('.houses-rail')!
    const track = root.querySelector<HTMLElement>('.houses-rail__track')!
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const wide = window.matchMedia('(min-width: 1241px)')

    let on = false
    let raf = 0
    let cur = -1 // smoothed scroll distance into the scene
    let lastD = 0
    let m = { W: 0, H: 0, visH: 0, visTop: 0, f: 1, winH: 0, start: 0, end: 0, rail: 0, total: 0 }

    const measure = () => {
      const W = pin.clientWidth
      const vh = window.innerHeight
      const H = Math.max(collection.offsetHeight, vh - NAV_H)
      const visH = vh - NAV_H
      const visTop = H - visH
      const f = Math.min(1, visH / FIT_H)
      // Vertical rail (in comp px, i.e. before --fit): the panel rises from below the fold,
      // stays out of sight while the scene settles, then travels up until its last card has arrived.
      const winH = visH / f
      const start = winH
      const end = Math.min(RAIL_PAD, winH - PANEL_H - RAIL_PAD)
      const rail = Math.max(500, (start - end) * f * 1.2)
      const total = MORPH + ARRIVE + HOLD + rail + END_HOLD
      m = { W, H, visH, visTop, f, winH, start, end, rail, total }
      root.style.setProperty('--scene-h', `${H + total}px`)
      root.style.setProperty('--pin-h', `${H}px`)
      root.style.setProperty('--pin-top', `${vh - H < NAV_H ? vh - H : NAV_H}px`)
      root.style.setProperty('--vis-top', `${visTop}px`)
      root.style.setProperty('--vis-h', `${visH}px`)
      root.style.setProperty('--fit', `${f}`)
      root.style.setProperty('--rail-h', `${winH}px`)
      // centre the copy + QR block vertically; the phone moves down with it and may run past the fold
      const lshift = (winH - BLOCK_H) / 2 - BLOCK_TOP
      root.style.setProperty('--lshift', `${lshift}px`)
      // Keep the page margins at any size: left column at 182/1600 of the width, right
      // margin 124/1600 (Figma), whatever the fit scale.
      const u = W / 1600
      const compX = 182 * u - 182 * f
      root.style.setProperty('--comp-x', `${compX}px`)
      // houses panel: centred between the left column's right edge (the phone, Figma x 751)
      // and the right margin
      const leftEdge = compX + 751.11 * f
      const rightEdge = W - 124 * u
      const panelX = (leftEdge + rightEdge) / 2 - (693 * f) / 2
      root.style.setProperty('--rail-dx', `${(panelX - compX) / f - 783}px`)
      // how far the phone hangs below the visible area (shown in full once the pin lets go)
      const phoneBottom = (PHONE_BOTTOM + lshift) * f
      root.style.setProperty('--phone-overflow', `${Math.max(0, phoneBottom - visH + 56)}px`)
    }

    const render = (d: number) => {
      const { W, visH, visTop, start, end, rail } = m
      const e = ease(clamp01(d / MORPH))
      const p3 = clamp01((d - MORPH - ARRIVE - HOLD) / rail)

      // 1. Morph: only the McGonagall image enlarges. Its crop window opens from the tile to
      //    the whole visible area while the photo travels straight from its in-tile size and
      //    position to its final framing on the right — one move, no stop at full screen.
      const u = W / 1600
      const wx = TILE.x * u
      const wy = TILE.y * u - visTop // in .sorting coords (top of the visible area)
      const ww = TILE.w * u
      const wh = TILE.h * u
      const clip = [lerp(wy, 0, e), lerp(W - wx - ww, 0, e), lerp(visH - wy - wh, 0, e), lerp(wx, 0, e)]
      bgWin.style.clipPath = `inset(${clip.map((v) => `${v}px`).join(' ')})`

      const w2 = Math.max(0.8571 * W, (visH * IMG_W) / IMG_H)
      const bw = lerp(TILE_IMG.w * u, w2, e)
      const bx = lerp(wx + TILE_IMG.x * u, 0.3407 * W, e)
      const by = lerp(wy + TILE_IMG.y * u, 0, e)
      bg.style.transform = `translate3d(${bx}px, ${by}px, 0) scale(${bw / IMG_W})`

      // the tile hands its photo to the growing image as soon as the scene starts
      const handed = d > 0.5
      bgWin.style.opacity = handed ? '1' : '0'
      tile.style.visibility = handed ? 'hidden' : 'visible'

      // the gradient rises with the move, so the image lands already shaded
      shade.style.opacity = `${ease(clamp01((e - 0.2) / 0.8))}`

      // Gallery+ fades and drifts up as the image leaves it
      const leave = clamp01(e * 1.35)
      collection.style.opacity = `${1 - leave}`
      collection.style.transform = `translate3d(0, ${-160 * ease(leave)}px, 0)`
      collection.style.visibility = leave >= 0.999 ? 'hidden' : 'visible'

      // Left column: arrives as the photo lands (scrolling down); on the way back up it
      // leaves while the photo is still in place — LEAVE_GAP px before the photo starts to move.
      const goingDown = d > lastD
      const goingUp = d < lastD
      if (goingDown && e > 0.78) root.classList.add('is-sorting')
      else if (goingUp && d < MORPH + LEAVE_GAP) root.classList.remove('is-sorting')
      lastD = d

      // 3. Rail: the houses panel stays below the fold until the rail phase, then rises
      //    through its window while the copy, QR and phone hold still
      const y = lerp(start, end, ease(p3))
      track.style.transform = `translate3d(0, ${y}px, 0)`
      railWin.classList.toggle('is-live', p3 > 0.2)
    }

    const tick = () => {
      const top = root.getBoundingClientRect().top
      const pinTop = parseFloat(root.style.getPropertyValue('--pin-top')) || NAV_H
      const target = Math.min(m.total, Math.max(0, pinTop - top))
      cur = cur < 0 || Math.abs(target - cur) > 4000 ? target : cur + (target - cur) * 0.14
      if (Math.abs(target - cur) < 0.1) cur = target
      render(cur)
      raf = requestAnimationFrame(tick)
    }

    const enable = () => {
      on = true
      root.classList.add('scene--on')
      measure()
      cur = -1
      raf = requestAnimationFrame(tick)
    }

    const disable = () => {
      on = false
      cancelAnimationFrame(raf)
      root.classList.remove('scene--on')
      root.classList.add('is-sorting')
      ;[collection, bg, bgWin, shade, track].forEach((el) => el.removeAttribute('style'))
      tile.style.visibility = '' // keep its inline layout (left/top/size)
      railWin.classList.add('is-live')
      // stacked layout: scale the QR + accent + phone group (632×650 Figma px) to fit
      const room = root.clientWidth - 48 // the stacked .sorting has 24px side padding
      root.style.setProperty('--dev-scale', `${Math.min(1, room / DEVICE_W)}`)
    }

    const sync = () => {
      const want = wide.matches && !reduce.matches
      if (want && !on) enable()
      else if (!want && on) disable()
      else if (!want) disable()
      else measure()
    }

    sync()
    window.addEventListener('resize', sync)
    wide.addEventListener('change', sync)
    reduce.addEventListener('change', sync)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', sync)
      wide.removeEventListener('change', sync)
      reduce.removeEventListener('change', sync)
    }
  }, [scene])
}

/**
 * Phones: once the houses row is fully on screen it pins, and scrolling down moves it
 * sideways through the houses instead of moving the page; after the last house the
 * page scrolls on. The row can still be swiped by hand. A swipe is
 * kept as an offset on top of the scroll-linked position, so the two add up rather
 * than fight; scrolling back up returns it the other way.
 */
function useHousesRow(scene: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = scene.current
    if (!root) return
    const row = root.querySelector<HTMLElement>('.houses-panel')
    if (!row) return
    const phone = window.matchMedia('(max-width: 767px)')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    // the whole column (copy, CTA, QR + phone, houses) pins, so nothing moves up
    const pin = root.querySelector<HTMLElement>('.sorting__stage')!
    const spacer = root.querySelector<HTMLElement>('.sorting__travel')!
    let offset = 0 // from the user's own swipes
    let expected = -1 // scrollLeft we last set ourselves
    let raf = 0
    let railTop = 0
    let travel = 1

    const active = () => phone.matches && !reduce.matches && !root.classList.contains('scene--on')

    // The row pins once it's fully on screen; the page's vertical scroll is then spent
    // moving it sideways (1px down = 1px across), and the page moves on once the last
    // house is in.
    const measure = () => {
      if (!active()) {
        spacer.style.height = ''
        pin.style.top = ''
        return
      }
      const vh = window.innerHeight
      // pins once the houses are fully on screen (column bottom 24px above the fold);
      // a short column pins under the nav instead
      railTop = Math.min(NAV_H, vh - pin.offsetHeight - 24)
      travel = Math.max(1, row.scrollWidth - row.clientWidth)
      spacer.style.height = `${travel}px`
      pin.style.top = `${railTop}px`
    }

    // progress = how far the page has scrolled since the column pinned (its natural
    // position is the spacer's top minus its own height)
    const linked = () => {
      const natural = spacer.getBoundingClientRect().top - GRID_GAP - pin.offsetHeight
      return Math.min(1, Math.max(0, (railTop - natural) / travel))
    }

    const apply = () => {
      raf = 0
      measure() // cheap, and keeps up with banners loading / text reflowing
      if (!active()) return
      const max = row.scrollWidth - row.clientWidth
      const left = Math.min(max, Math.max(0, linked() * max + offset))
      expected = Math.round(left)
      row.scrollLeft = left
    }

    const onPage = () => {
      if (!raf) raf = requestAnimationFrame(apply)
    }

    const onResize = () => {
      measure()
      onPage()
    }

    // a horizontal scroll we didn't cause = the user swiping: keep it as an offset
    const onRow = () => {
      if (Math.abs(row.scrollLeft - expected) <= 1) return
      const max = row.scrollWidth - row.clientWidth
      offset = row.scrollLeft - linked() * max
      expected = Math.round(row.scrollLeft)
    }

    measure()
    apply()
    window.addEventListener('scroll', onPage, { passive: true })
    window.addEventListener('resize', onResize)
    row.addEventListener('scroll', onRow, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onPage)
      window.removeEventListener('resize', onResize)
      row.removeEventListener('scroll', onRow)
      spacer.style.height = ''
      pin.style.top = ''
    }
  }, [scene])
}

export default function SortingHouses() {
  const scene = useRef<HTMLDivElement>(null)
  useScene(scene)
  useHousesRow(scene)

  return (
    <div className="scene" ref={scene}>
      <div className="scene__pin">
        <Collection />

        <section className="sorting" data-section="sorting-houses">
          <div className="sorting__bg-win" aria-hidden="true">
            <img className="sorting__bg" src={`${A}/sorting-bg.jpg`} alt="" />
          </div>
          <div className="sorting__shade" aria-hidden="true" />

          <div className="sorting__stage">
            <div className="sorting__comp">
              <div className="sorting__copy">
                <p className="overline sc-step reveal-stacked" style={{ '--d': 0 } as React.CSSProperties}>choose your hogwarts house</p>
                <h2 className="t3 sc-step reveal-stacked" style={{ '--d': 1 } as React.CSSProperties}>Let the Sorting Hat decide</h2>
                <p className="body-2 sc-step reveal-stacked" style={{ '--d': 2 } as React.CSSProperties}>
                  Scan to try on the Sorting Hat from your smartphone. Share your Hogwarts portrait and tag @LGUSA for
                  a chance to win a 77" LG W6 OLED evo and a Harry Potter bundle.
                </p>
                {/* narrow screens: you're probably already on your phone, so link straight in */}
                <a className="btn btn--secondary sorting__cta sc-step reveal-stacked" style={{ '--d': 3 } as React.CSSProperties} href="#">
                  Get Sorted
                </a>
              </div>

              {/* QR card, its accent frame and the phone stay together as one group; on
                  narrow screens the whole group scales down as on desktop */}
              <div className="sorting__device">
                <div className="sorting__device-inner">
                  <div className="sorting__qr sc-step reveal-stacked" style={{ '--d': 2 } as React.CSSProperties}>
                    <img className="sorting__qr-code" src={`${A}/qr-code.png`} alt="QR code to try on the Sorting Hat" />
                  </div>
                  <img
                    className="sorting__qr-frame sc-step reveal-stacked"
                    style={{ '--d': 3 } as React.CSSProperties}
                    src={`${A}/qr-frame.png`}
                    alt=""
                    aria-hidden="true"
                  />

                  <div className="sorting__phone sc-step reveal-stacked" style={{ '--d': 4 } as React.CSSProperties}>
                    <img className="sorting__screen" src={`${A}/phone-screen.png`} alt="Sorting Hat experience on a phone: Get Sorted" />
                    <div
                      className="sorting__frame"
                      style={{ maskImage: `url(${A}/phone1-mask.svg)`, WebkitMaskImage: `url(${A}/phone1-mask.svg)` }}
                    >
                      <img src={`${A}/phone-frame.png`} alt="" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Houses rail: the panel rises through this window while the rest of the scene holds still */}
              {/* phones: this wrapper gives the pinned houses row its scroll length */}
              <div className="houses-pin">
                <div className="houses-rail">
                  <ul className="houses-rail__track houses-panel">
                    {houses.map((h) => (
                      <li className="house-card" key={h.name}>
                        <img className="house-card__banner" src={h.banner} alt={`${h.name} house banner`} />
                        <div className="house-card__body">
                          <h3 className="house-card__name">{h.name}</h3>
                          <p className="body-2 house-card__desc">{h.body}</p>
                          <a className="btn btn--text house-card__download" href={h.wallpaper} download>
                            Download Wallpaper
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
          {/* phones: scroll length for the pinned houses slide (height set in JS) */}
          <div className="sorting__travel" aria-hidden="true" />
        </section>
      </div>
    </div>
  )
}
