import { useEffect } from 'react'

/**
 * Depth trigger for the whole page: watches every `.reveal` element and adds
 * `.is-in` when it scrolls up to 18% above the bottom of the viewport.
 *
 * It replays on every downward pass: once an element has dropped fully below
 * the screen again (you scrolled back up past it), `.is-in` is removed, so the
 * next time you scroll down to it, it animates in again. Scrolling up never
 * hides anything that's on screen — elements above stay revealed.
 *
 * - `.reveal-group`: triggers all `.reveal` children together when the group
 *   reaches the depth (for horizontal carousels whose cards start off-screen).
 * - Reaching the bottom of the page reveals anything left, so the last items
 *   never get stuck short of the trigger line.
 * - `[data-reveal-early]`: section content that shouldn't wait for the text above
 *   it. It starts as soon as any of it is on screen, or shortly after its section's
 *   heading starts revealing (if it's on screen by then), whichever comes first.
 * - `[data-reveal-lead="0.2"]`: long entrances that should start before they reach the
 *   screen — here, once the element's top is within 0.2 × the viewport height below
 *   the bottom edge. Re-arms once it's back beyond that distance.
 *
 * Call once from App after the sections mount.
 */
export function useRevealOnScroll() {
  useEffect(() => {
    // .reveal-stacked: items that only rise in when their section stacks (e.g. the
    // Sorting Hat column on narrow screens; on desktop its pinned scene drives them)
    const all = Array.from(document.querySelectorAll<HTMLElement>('.reveal, .reveal-stacked'))
    const EARLY_LAG_MS = 300 // early content follows its section's heading this closely
    const isEarly = (el: Element) => el.hasAttribute('data-reveal-early')
    const early = all.filter(isEarly)
    const lagTimers = new Set<number>()
    const show = (el: Element) => {
      const was = el.classList.contains('is-in')
      el.classList.add('is-in')
      el.querySelectorAll('.reveal').forEach((c) => c.classList.add('is-in'))
      if (was || isEarly(el)) return
      // the heading of a section started: bring its early content in right behind it
      const section = el.closest('[data-section]')
      if (!section) return
      early.forEach((e) => {
        if (e.closest('[data-section]') !== section || e.classList.contains('is-in')) return
        const t = window.setTimeout(() => {
          lagTimers.delete(t)
          if (e.getBoundingClientRect().top < window.innerHeight * 0.94) show(e)
        }, EARLY_LAG_MS)
        lagTimers.add(t)
      })
    }
    const reset = (el: Element) => {
      el.classList.remove('is-in')
      el.querySelectorAll('.reveal').forEach((c) => c.classList.remove('is-in'))
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      all.forEach(show)
      return
    }

    const groups = Array.from(document.querySelectorAll<HTMLElement>('.reveal-group'))
    const singles = all.filter((el) => !el.closest('.reveal-group'))
    const targets = [...groups, ...singles]
    const leadOf = (el: Element) => parseFloat((el as HTMLElement).dataset.revealLead ?? '') || 0
    const leaded = targets.filter((el) => leadOf(el) > 0) // handled by check() alone
    const observed = targets.filter((el) => leadOf(el) === 0)
    const normal = observed.filter((el) => !isEarly(el))

    // trigger line: 18% above the bottom of the viewport
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) show(e.target)
      },
      { rootMargin: '0px 0px -18% 0px', threshold: 0 },
    )

    // re-arm: once an element is entirely below the screen, hide it again so the
    // next scroll down replays its entrance (elements above the screen stay shown)
    const rearm = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const below = e.boundingClientRect.top >= (e.rootBounds?.bottom ?? window.innerHeight)
          if (!e.isIntersecting && below) reset(e.target)
        }
      },
      { threshold: 0 },
    )

    // early content: as soon as a sliver of it is on screen
    const ioEarly = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) show(e.target)
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0 },
    )

    normal.forEach((el) => io.observe(el))
    early.filter((el) => leadOf(el) === 0).forEach((el) => ioEarly.observe(el))
    observed.forEach((el) => rearm.observe(el))

    let raf = 0
    const check = () => {
      raf = 0
      const vh = window.innerHeight
      // a jump (scrollbar drag, anchor link) can skip the observers: anything now
      // entirely below the screen re-arms, and anything already above the trigger
      // line (jumped past) is shown, so scrolling back up never finds hidden gaps
      targets.forEach((el) => {
        const top = el.getBoundingClientRect().top
        const isIn = el.classList.contains('is-in')
        const lead = leadOf(el)
        if (isIn && top >= vh * (1 + lead)) reset(el)
        else if (!isIn && top < vh * (lead ? 1 + lead : isEarly(el) ? 0.94 : 0.82)) show(el)
      })
      const atBottom = vh + window.scrollY >= document.documentElement.scrollHeight - 4
      if (atBottom) {
        targets.forEach((el) => {
          if (el.getBoundingClientRect().top < vh) show(el)
        })
      }
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    if (leaded.length) onScroll()

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      ioEarly.disconnect()
      rearm.disconnect()
      lagTimers.forEach((t) => window.clearTimeout(t))
      window.removeEventListener('scroll', onScroll)
    }
  }, [])
}
