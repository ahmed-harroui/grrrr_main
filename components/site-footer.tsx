import Link from 'next/link'
import { PawPrint } from 'lucide-react'
import { PRODUCTS } from '@/lib/products'

export function SiteFooter() {
  return (
    <footer className="site-footer container">
      <div className="footer-brand">
        <Link className="wordmark" href="/"><span className="wordmark-mark"><PawPrint size={18} strokeWidth={2.5} /></span>grr<span className="wordmark-dot">.</span></Link>
        <p>For the love of good company.</p>
      </div>
      <div className="footer-col">
        <h4>The apps</h4>
        {PRODUCTS.map((p) => (
          <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer" className={`app-link ${p.color}`}><i />{p.name} ↗</a>
        ))}
      </div>
      <div className="footer-col">
        <h4>The journal</h4>
        <Link href="/guides">Guides</Link>
        <Link href="/threads?sort=trending">Trending threads</Link>
        <Link href="/threads/new">Post a thread</Link>
      </div>
      <div className="footer-col">
        <h4>Grr</h4>
        <Link href="/#ecosystem">The ecosystem</Link>
        <Link href="/#about">Newsletter</Link>
        <Link href="/account">My account</Link>
      </div>
      <p className="footer-legal">© {new Date().getFullYear()} Great Rascals · Grr</p>
    </footer>
  )
}
