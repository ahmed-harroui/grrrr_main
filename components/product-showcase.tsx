import { ArrowUpRight, BadgeCheck, Bone, Check, Dog, Gift, Heart, MapPin, Shirt, Sparkles, Syringe, X } from 'lucide-react'
import { PRODUCTS, type Product } from '@/lib/products'

/** A small, decorative preview of each app, drawn in its own colours. */
function Preview({ id }: { id: Product['id'] }) {
  if (id === 'dating') {
    return (
      <div className="eco-preview eco-preview-dating" aria-hidden="true">
        <div className="swipe-card swipe-card-back" />
        <div className="swipe-card">
          <div className="swipe-photo"><Dog size={64} strokeWidth={1.4} /></div>
          <div className="swipe-info"><strong>Biscuit, 3</strong><span><MapPin size={11} /> 1.2 km · loves the beach</span></div>
          <div className="swipe-slider"><span>Friend</span><i><b /></i><span>Hot</span></div>
          <div className="swipe-actions"><span className="swipe-no"><X size={18} /></span><span className="swipe-yes"><Heart size={18} fill="currentColor" /></span></div>
        </div>
        <div className="swipe-match"><Heart size={13} fill="currentColor" /> It’s a match!</div>
      </div>
    )
  }
  if (id === 'care') {
    return (
      <div className="eco-preview eco-preview-care" aria-hidden="true">
        <div className="care-card">
          <div className="care-head">
            <div className="care-ring" style={{ ['--score' as string]: 82 }}><span>82</span></div>
            <div><strong>Luna</strong><span>Health score · on track</span></div>
          </div>
          <div className="care-row"><Syringe size={14} /> Rabies booster <em>in 12 days</em></div>
          <div className="care-row"><Check size={14} /> Worming <em>done</em></div>
          <div className="care-row"><BadgeCheck size={14} /> Pet passport <em>read by AI</em></div>
        </div>
        <div className="care-bubble"><Sparkles size={13} /> <span><strong>GRRR</strong> Luna’s booster is due soon. Shall I find a vet nearby?</span></div>
      </div>
    )
  }
  const items = [
    { icon: Heart, name: 'Name collar', price: '€24.90' },
    { icon: BadgeCheck, name: 'ID tag', price: '€19.90' },
    { icon: Bone, name: 'Treats', price: '€12.90' },
    { icon: Shirt, name: 'Human tee', price: '' },
  ]
  return (
    <div className="eco-preview eco-preview-store" aria-hidden="true">
      <div className="store-grid">
        {items.map(({ icon: Icon, name, price }) => (
          <div className="store-item" key={name}><Icon size={30} strokeWidth={1.5} /><span>{name}</span>{price && <em>{price}</em>}</div>
        ))}
      </div>
      <div className="store-tag"><Gift size={13} /> Personalised with <strong>their name</strong></div>
    </div>
  )
}

export function ProductShowcase() {
  return (
    <div className="eco-list">
      {PRODUCTS.map((product, index) => {
        const Icon = product.icon
        return (
          <article className={`eco-product ${product.color}`} id={product.id} key={product.id}>
            <div className="eco-copy">
              <div className="eco-top"><span className="product-number">0{index + 1}</span><span className="eco-icon"><Icon size={20} strokeWidth={2} /></span><span className="eco-name">{product.name}</span></div>
              <h3>{product.tagline}</h3>
              <p>{product.description}</p>
              <ul className="eco-features">
                {product.features.map((f) => <li key={f}><Check size={14} strokeWidth={2.6} /> {f}</li>)}
              </ul>
              <div className="eco-actions">
                <a className="button button-dark" href={product.url} target="_blank" rel="noopener noreferrer">{product.cta} <ArrowUpRight size={16} /></a>
                <span className="eco-host">{product.host}</span>
              </div>
            </div>
            <Preview id={product.id} />
          </article>
        )
      })}
    </div>
  )
}

/** Compact links to the three apps, for the header menu and the footer. */
export function ProductLinks({ className }: { className?: string }) {
  return (
    <div className={className}>
      {PRODUCTS.map((p) => (
        <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer" className={`app-link ${p.color}`}><i />{p.name.replace('Grr ', '')}</a>
      ))}
    </div>
  )
}
