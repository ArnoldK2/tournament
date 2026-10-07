import './brand-logos.css'

const ORG_LOGOS: Record<string, { src: string; alt: string }> = {
  'f99de211-afdb-4dd3-bd53-f89517c4d042': { src: '/logos/playhouse.png', alt: 'Playhouse' },
}

interface Props {
  orgId?: string
  variant?: 'corner' | 'footer' | 'inline'
}

export default function BrandLogos({ orgId, variant = 'footer' }: Props) {
  if (!orgId) return null
  const logo = ORG_LOGOS[orgId]
  if (!logo) return null

  return (
    <div className={`bl-wrap bl-${variant}`}>
      <img src={logo.src} alt={logo.alt} className="bl-playhouse" />
    </div>
  )
}
