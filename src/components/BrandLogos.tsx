import './brand-logos.css'

interface Props {
  /** 'corner' = fixed bottom-left watermark (projection pages)
   *  'footer' = inline centered footer (normal pages) */
  variant?: 'corner' | 'footer'
}

export default function BrandLogos({ variant = 'footer' }: Props) {
  return (
    <div className={`bl-wrap bl-${variant}`}>
      <img src="/logos/tcnoga-gala.png" alt="TCNOGA Sports Gala" className="bl-tcnoga" />
      <img src="/logos/playhouse.png"   alt="Playhouse"          className="bl-playhouse" />
    </div>
  )
}
