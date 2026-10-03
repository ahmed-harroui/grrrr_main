'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// The site's motion, in one place (mounted once, in app/layout.tsx), so pages stay plain markup:
//  - reveal: headings, cards and rows rise into view as they scroll in, one after the other;
//  - parallax: elements with data-parallax drift slower than the page;
//  - counters: numbers with data-count count up when they appear;
//  - the reading bar at the top of the page.
// Visitors who ask their system for less motion get none of it.

const REVEAL = [
  '.eyebrow', 'h1', '.section-intro h2', '.adopt-section-head h2', '.knowledge-head h2', '.stories h2', '.newsletter h2', '.home-adopt h2',
  '.hero-lede', '.hero-actions', '.hero-apps', '.adopt-tabs', '.adopt-hero-card',
  '.eco-product', '.journal-col', '.journal-cta', '.journal-item', '.thread-card', '.litter-card', '.litter-tile', '.listing-card',
  '.mine-card', '.give-photo', '.give-info', '.guide-card', '.home-adopt-stats', '.adopt-empty', '.footer-col',
].join(',')

export function Motion() {
  const pathname = usePathname()

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    document.documentElement.classList.add('motion')

    // ---------- reveal on scroll, staggered among siblings that appear together ----------
    const seen = new WeakSet<Element>()
    const reveal = new IntersectionObserver(
      (entries) => {
        let order = 0
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const el = entry.target as HTMLElement
          el.style.setProperty('--reveal-delay', `${Math.min(order++, 6) * 70}ms`)
          el.classList.add('is-in')
          reveal.unobserve(el)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
    const watch = () => {
      for (const el of document.querySelectorAll(REVEAL)) {
        if (seen.has(el) || el.closest('.kf-stage')) continue
        seen.add(el)
        el.classList.add('reveal')
        reveal.observe(el)
      }
      for (const el of document.querySelectorAll<HTMLElement>('[data-count]')) {
        if (seen.has(el)) continue
        seen.add(el)
        counters.observe(el)
      }
    }

    // ---------- counters ----------
    const counters = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const el = entry.target as HTMLElement
        counters.unobserve(el)
        const target = Number(el.dataset.count) || 0
        const start = performance.now()
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / 1100)
          el.textContent = String(Math.round(target * (1 - Math.pow(1 - t, 3))))
          if (t < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    })

    // ---------- parallax + reading bar ----------
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight
        document.documentElement.style.setProperty('--scroll-progress', String(max > 0 ? window.scrollY / max : 0))
        // Safety net: whatever is already on screen shows, even if the observer missed it
        // (a jump to an anchor, a very fast scroll), so nothing can stay hidden.
        for (const el of document.querySelectorAll<HTMLElement>('.reveal:not(.is-in)')) {
          if (el.getBoundingClientRect().top < window.innerHeight * 0.98) el.classList.add('is-in')
        }
        for (const el of document.querySelectorAll<HTMLElement>('[data-parallax]')) {
          const rect = el.getBoundingClientRect()
          if (rect.bottom < -200 || rect.top > window.innerHeight + 200) continue
          const speed = Number(el.dataset.parallax) || 0.12
          el.style.transform = `translate3d(0, ${(rect.top + rect.height / 2 - window.innerHeight / 2) * -speed}px, 0)`
        }
      })
    }

    watch()
    onScroll()
    // Content that streams in later (client components, pagination) is picked up too.
    const mutations = new MutationObserver(() => watch())
    mutations.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      reveal.disconnect()
      counters.disconnect()
      mutations.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [pathname])

  return <div className="scroll-progress" aria-hidden="true" />
}
