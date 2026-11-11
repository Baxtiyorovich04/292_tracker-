import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { CloudOff, PanelLeft, PanelLeftClose } from 'lucide-react'
import { useStore } from '../context/Store.jsx'
import { NAV } from './icons.jsx'

export function Shell({ children }) {
  const { offline, sync, user } = useStore()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('292-nav') === 'compact')

  function toggleNav() {
    setCollapsed((value) => {
      localStorage.setItem('292-nav', value ? 'open' : 'compact')
      return !value
    })
  }

  const showBanner = offline || (user && sync === 'error')

  return (
    <div className="flex min-h-dvh">
      <aside
        className={`sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-bg/70 px-3 py-4 backdrop-blur-xl md:flex ${collapsed ? 'w-[88px]' : 'w-[240px]'}`}
      >
        <div className={`px-2 pt-2 pb-6 ${collapsed ? 'text-center' : ''}`}>
          <div className="font-display text-3xl tracking-tight">292</div>
          {!collapsed && <p className="mt-1 text-xs text-muted">Discipline, measured.</p>}
        </div>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Primary">
          {NAV.map((link) => {
            const Icon = link.icon
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                title={link.label}
                className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''} ${collapsed ? 'justify-center px-0' : ''}`}
              >
                <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                {!collapsed && <span className="font-medium">{link.label}</span>}
              </NavLink>
            )
          })}
        </nav>
        <button className="nav-link mt-2 justify-center" type="button" onClick={toggleNav} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {showBanner && (
          <div className="flex items-center justify-center gap-2 bg-ember/15 px-4 py-2 text-center text-xs" role="status">
            <CloudOff size={14} aria-hidden="true" />
            {offline ? 'Offline. Edits stay on this device until you reconnect.' : 'Saved on this device. Cloud sync did not go through.'}
          </div>
        )}
        <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 pt-5 pb-28 md:px-8 md:pt-8 md:pb-12">{children}</main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[var(--nav)] backdrop-blur-xl md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Primary"
      >
        <ul className="grid grid-cols-5">
          {NAV.map((link) => {
            const Icon = link.icon
            return (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1 py-2.5 text-[10px] tracking-wide ${isActive ? 'text-ember' : 'text-muted'}`
                  }
                >
                  <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                  {link.label}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
