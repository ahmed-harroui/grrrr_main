'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { PRODUCTS } from '@/lib/products'

const LINKS = [
  { href: '/adopt', label: 'Adopt', hint: 'Babies to come and pets to give' },
  { href: '/guides', label: 'Guides', hint: 'Real questions, answered properly' },
  { href: '/threads', label: 'Threads', hint: 'Stories and facts from the community' },
  { href: '/#ecosystem', label: 'The apps', hint: 'Dating, Care and Store' },
]

/** On phones the navigation is a full-width panel behind one button; it closes when a page opens. */
export function MobileMenu({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <div className="mobile-menu">
      <button type="button" className="mobile-menu-button" aria-expanded={open} aria-label={open ? 'Close the menu' : 'Open the menu'} onClick={() => setOpen((o) => !o)}>
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>
      {open && (
        <div className="mobile-menu-panel">
          {LINKS.map((link, index) => (
            <Link key={link.href} href={link.href} className="mobile-menu-link" style={{ animationDelay: `${index * 50}ms` }} onClick={() => setOpen(false)}>
              <strong>{link.label}</strong>
              <span>{link.hint}</span>
            </Link>
          ))}
          <div className="mobile-menu-apps">
            {PRODUCTS.map((p) => <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer" className={`hero-app ${p.color}`}>{p.name} ↗</a>)}
          </div>
          <Link href={signedIn ? '/account' : '/login'} className="button button-dark mobile-menu-account" onClick={() => setOpen(false)}>{signedIn ? 'My account' : 'Sign in'}</Link>
        </div>
      )}
    </div>
  )
}
