import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'

function ExitIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

export default function AdminUserInfo() {
  const navigate = useNavigate()
  const logout = useStore(s => s.logout)
  const currentUser = useStore(s => s.currentUser)
  const role = useStore(s => s.currentRole)
  const user = currentUser()

  const roleLabel =
    role === 'super_admin' ? 'Super Admin' :
    role === 'client_admin' ? 'Admin' :
    role === 'data_collector' ? 'Collector' : ''

  const roleCls =
    role === 'super_admin' ? 'sa' :
    role === 'client_admin' ? 'admin' : 'dc'

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className="aui-wrap">
      {user && (
        <div className="aui-info">
          <span className="aui-name">{user.display_name}</span>
          <span className="aui-meta">
            <span className={`aui-role role-badge ${roleCls}`}>{roleLabel}</span>
          </span>
        </div>
      )}
      <button className="aui-exit-btn" onClick={handleLogout} title="Log out">
        <ExitIcon />
      </button>
    </div>
  )
}
