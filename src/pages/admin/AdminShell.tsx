import type { ReactNode } from 'react'
import { useStore } from '../../store'
import '../../styles/admin.css'

interface Props {
  title: string
  clientId: string
  onBack: () => void
  children: ReactNode
}

export default function AdminShell({ title, clientId, onBack, children }: Props) {
  const clients = useStore(s => s.clients)
  const client = clients.find(c => c.id === clientId)

  return (
    <div className="admin-root">
      <header className="admin-header">
        <div>
          <p className="admin-client-name">{client?.name}</p>
          <h1 className="admin-page-title">{title}</h1>
        </div>
        <button className="admin-back-btn" onClick={onBack}>← Dashboard</button>
      </header>
      <div className="admin-body">
        {children}
      </div>
    </div>
  )
}
