import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import AdminUserInfo from './AdminUserInfo'

export interface Crumb {
  label: string
  to?: string
  badge?: { text: string; status: string }
}

interface Props {
  orgName?: string
  crumbs?: Crumb[]
  children?: ReactNode  // action buttons slotted into the right side
}

export default function AdminHeader({ orgName, crumbs = [], children }: Props) {
  const navigate = useNavigate()
  const role = useStore(s => s.currentRole)
  const isAdmin = role === 'client_admin' || role === 'super_admin'
  const backCrumb = isAdmin ? [...crumbs].reverse().find(c => c.to) : null

  return (
    <header className="admin-header">
      <div className="ah-left">
        {/* Mobile: back button */}
        {backCrumb && (
          <button className="ah-back-btn" onClick={() => navigate(backCrumb.to!)}>
            ← {backCrumb.label}
          </button>
        )}

        {/* Desktop: org name + breadcrumbs */}
        {orgName && <span className="ah-org">{orgName}</span>}
        {crumbs.length > 0 && (
          <nav className="ah-breadcrumbs" aria-label="breadcrumb">
            {crumbs.map((crumb, i) => (
              <span key={i} className="ah-crumb-item">
                {i > 0 && <span className="ah-sep">›</span>}
                {crumb.to
                  ? <Link to={crumb.to} className="ah-crumb-link">{crumb.label}</Link>
                  : <span className="ah-crumb-current">{crumb.label}</span>
                }
                {crumb.badge && (
                  <span className={`ah-crumb-badge status-${crumb.badge.status}`}>{crumb.badge.text}</span>
                )}
              </span>
            ))}
          </nav>
        )}
      </div>
      <div className="admin-header-right">
        {children}
        <AdminUserInfo />
      </div>
    </header>
  )
}
