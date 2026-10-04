import Link from 'next/link'
import { ArrowUpRight, PawPrint } from 'lucide-react'
import { signOut } from '@/app/threads/actions'
import { ProductLinks } from '@/components/product-showcase'
import { MobileMenu } from '@/components/mobile-menu'
import { getCurrentProfile } from '@/lib/supabase/server'

export async function SiteHeader() {
  const profile = await getCurrentProfile()
  return (
    <header className="nav-bar">
      <nav className="nav container" aria-label="Main navigation">
        <Link className="wordmark" href="/" aria-label="Grr home"><span className="wordmark-mark"><PawPrint size={18} strokeWidth={2.5} /></span>grr<span className="wordmark-dot">.</span></Link>
        <div className="nav-links">
          <Link href="/adopt" className="nav-adopt">Adopt</Link>
          <Link href="/guides">Guides</Link>
          <Link href="/threads">Threads</Link>
          <Link href="/#ecosystem">The apps</Link>
          <ProductLinks className="nav-apps" />
        </div>
        {profile ? (
          <div className="nav-account">
            <Link href="/account" className="nav-user">@{profile.username}</Link>
            <form action={signOut}><button type="submit" className="nav-signout">Sign out</button></form>
          </div>
        ) : (
          <Link href="/login" className="nav-cta">Sign in <ArrowUpRight size={15} /></Link>
        )}
        <MobileMenu signedIn={Boolean(profile)} />
      </nav>
    </header>
  )
}
