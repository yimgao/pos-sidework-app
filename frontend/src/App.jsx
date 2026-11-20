import { useEffect, useState } from 'react'
import { clearToken, listNotifications, login, loginUser, me, setToken } from './api'
import { dict, getLang, setLang } from './i18n'
import { initials, roleAvatarColor, roleLabel } from './roles'
import SchedulePage from './pages/SchedulePage'
import TodayPage from './pages/TodayPage'
import ReviewPage from './pages/ReviewPage'
import ScorePage from './pages/ScorePage'
import ReportPage from './pages/ReportPage'
import AiAssistantPage from './pages/AiAssistantPage'
import TasksPage from './pages/TasksPage'
import DashboardPage from './pages/DashboardPage'
import AccountsPage from './pages/AccountsPage'
import ProfilePage from './pages/ProfilePage'

function Icon({ name }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', width: 22, height: 22, viewBox: '0 0 24 24' }
  const paths = {
    schedule: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
    today: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 12l2 2 4-4" /></>,
    score: <><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" /></>,
    review: <><circle cx="12" cy="12" r="9" /><path d="M8 12l2 2 4-4" /></>,
    report: <><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M10 12h5M10 16h5" /></>,
    suggest: <><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.3 11c.7.5 1.3 1.2 1.3 2h4c0-.8.6-1.5 1.3-2A6 6 0 0 0 12 3z" /></>,
    grid: <><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="8" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /><rect x="13" y="13" width="8" height="8" rx="2" /></>,
    check: <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    spark: <><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" /></>,
    chart: <><path d="M3 3v18h18" /><path d="M7 15l4-5 3 3 5-7" /></>,
    collapse: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M15 3v18M10 8l-2 2 2 2" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
  }
  return <svg {...p}>{paths[name]}</svg>
}

// Notifications bell: real items only (GET /api/notifications). Read state
// lives in localStorage; opening the panel marks the shown items read.
function Bell({ lang }) {
  const L = dict(lang).notifications
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [read, setRead] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('pos-notif-read') || '[]')) } catch { return new Set() }
  })
  const load = () => listNotifications(lang).then(setItems).catch(() => {})
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t) }, [lang])
  const unread = items.filter((i) => !read.has(i.id))
  const toggle = () => {
    if (!open && items.length) {
      const next = new Set([...read, ...items.map((i) => i.id)])
      setRead(next)
      try { localStorage.setItem('pos-notif-read', JSON.stringify([...next])) } catch { /* ignore */ }
    }
    setOpen(!open)
  }
  const dot = { review: '#D97706', conflict: '#DC2626', suggestion: '#2F4F4F', complete: '#16A34A' }
  return (
    <div className="notif-wrap">
      <button className="notif-bell" onClick={toggle} aria-label={L.title}>
        <Icon name="bell" />
        {unread.length > 0 && <span className="notif-badge">{unread.length}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-head"><b>{L.title} ({unread.length} {L.unread})</b><button className="btn2" onClick={() => setOpen(false)}>×</button></div>
          {!items.length && <p className="muted" style={{ padding: '14px 16px' }}>{L.empty}</p>}
          {items.map((it) => (
            <div className="notif-item" key={it.id}>
              <span className="notif-dot" style={{ background: dot[it.kind] || '#6B7280' }} />
              <div style={{ flex: 1, minWidth: 0 }}><b>{it.title}</b><p>{it.body}</p></div>
              {it.time && <span className="notif-time">{it.time.slice(11, 16)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Employee "My" pages. Manager keeps them too; owner never sees them.
const COMMON = [
  ['schedule', 'schedule'],
  ['today', 'check'],
  ['score', 'chart'],
]
// Manager + owner pages. 'builder' and 'analytics' are separate tab keys
// from 'schedule'/'score' so the same page can appear twice in the nav
// (My Schedule + Schedule Builder) without duplicate React keys.
// 'review' stays: approving/rejecting sidework evidence is a core manager
// workflow and has no other home in the BrewLab layout.
const MANAGER = [
  ['dashboard', 'grid'],
  ['review', 'review'],
  ['builder', 'schedule'],
  ['tasks', 'check'],
  ['accounts', 'users'],
  ['ai', 'spark'],
  ['report', 'report'],
  ['analytics', 'chart'],
]

export default function App() {
  const [user, setUser] = useState(null)
  const [pin, setPin] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [usePin, setUsePin] = useState(false)
  const [msg, setMsg] = useState('')
  const [tab, setTab] = useState('schedule')
  const [collapsed, setCollapsed] = useState(false)
  const [lang, setLangState] = useState(getLang())
  const changeLang = (l) => { setLang(l); setLangState(l) }
  const L = dict(lang)
  useEffect(() => { if (localStorage.getItem('pos-token')) me().then(setUser).catch(() => clearToken()) }, [])
  if (!user) {
    const submit = async (u, p) => {
      try {
        const d = usePin ? await login(pin) : await loginUser(u ?? username, p ?? password)
        setToken(d.token); setUser(d.user); setTab(d.user.is_manager ? 'dashboard' : 'today')
      } catch (e) { setMsg(L.login.wrongPin) }
    }
    return (
      <div className="login-simple">
        <div className="login-card">
          {/* 只有 logo，不放品牌大面板（2026-11-19 用户：那块没必要）。Logo 本身是深绿色，放在白底卡片上。 */}
          <div className="login-logo">
            <img src="/yardkoo-logo.svg" alt="Yardkoo Seafood & Grill" />
          </div>
          <div className="login-form">
            <h2>{L.login.welcomeBack}</h2>
            <p className="muted">{L.appSub}</p>
            {usePin ? (<>
              <label className="field-label">{L.login.enterPin}</label>
              <input inputMode="numeric" placeholder={L.login.enterPin} value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit() }} />
            </>) : (<>
              <label className="field-label">{L.login.username}</label>
              <input placeholder={L.login.username} value={username} onChange={(e) => setUsername(e.target.value)} />
              <label className="field-label">{L.login.password}</label>
              <input placeholder={L.login.password} type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit() }} />
            </>)}
            <button className="btn login-btn" onClick={() => submit()}>{usePin ? L.login.enter : L.login.signIn}</button>
            <p className="muted"><button className="btn2" onClick={() => setUsePin(!usePin)}>{usePin ? L.login.useAccount : L.login.usePin}</button></p>
            {!usePin && (<>
              <div className="login-divider">{L.login.quickDemo}</div>
              <div className="demo-row">
                <button className="btn2" onClick={() => submit('owner', 'owner123')}>Owner</button>
                <button className="btn2" onClick={() => submit('manager', 'manager123')}>Manager</button>
                <button className="btn2" onClick={() => submit('anna', 'anna123')}>Anna</button>
              </div>
            </>)}
            <p className="muted">{L.login.demo}</p>
            <p className="muted error">{msg}</p>
          </div>
        </div>
      </div>
    )
  }
  const tabs = user.is_owner ? MANAGER : user.is_manager ? [...COMMON, ...MANAGER] : COMMON
  const logout = () => { clearToken(); setUser(null) }
  const roleText = user.is_owner ? L.owner : user.is_manager ? L.manager : roleLabel(user.role, L.staff)
  return (
    <div className="layout">
      <aside className={'sidebar' + (collapsed ? ' collapsed' : '')}>
        <div className="brand">
          <img className="brand-logo" src="/yardkoo-logo.svg" alt="Yardkoo Seafood & Grill" />
          <img className="brand-mark-img" src="/yardkoo-mark.svg" alt="Yardkoo" />
          <div><b>{L.appName}</b><small>{lang === 'en' ? 'Restaurant operations' : '餐厅运营'}</small></div>
        </div>
        {!user.is_owner && (<><p className="nav-label">{L.my}</p>
        <nav className="side-nav">
          {COMMON.map(([k, icon]) => (
            <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
              <Icon name={icon} /><span><b>{L.nav[k]}</b></span>
            </button>
          ))}
        </nav></>)}
        {user.is_manager && (<><p className="nav-label">{user.is_owner ? L.owner : L.manager}</p><nav className="side-nav">
          {MANAGER.map(([k, icon]) => (
            <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
              <Icon name={icon} /><span><b>{L.nav[k]}</b></span>
            </button>
          ))}
        </nav></>)}
        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
          <Icon name="collapse" /><span>{collapsed ? '›' : '‹ Collapse'}</span>
        </button>
        <button className="user-card" onClick={() => setTab('profile')}>
          <div className="avatar" style={{ background: roleAvatarColor(user.role), color: '#fff' }}>{initials(user.name)}</div>
          <div className="user-meta"><b>{user.name}</b><small>{roleText} · {L.profile.title} ›</small></div>
        </button>
      </aside>
      <div className="maincol">
        <header className="mobile-header"><b>{L.appName}</b><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Bell lang={lang} /><button className="avatar-btn" onClick={() => setTab('profile')}>{user.name.slice(0, 1)}</button></div></header>
        <header className="topbar">
          <div className="topbar-store">Yardkoo</div>
          {/* Decorative for now: no search backend yet, do not wire it to anything. */}
          <input className="topbar-search" placeholder={L.searchPlaceholder} />
          <Bell lang={lang} />
          <button className="topbar-user" onClick={() => setTab('profile')}>
            <div className="avatar" style={{ background: roleAvatarColor(user.role), color: '#fff' }}>{initials(user.name)}</div>
            <div className="user-meta"><b>{user.name}</b><small>{roleText}</small></div>
          </button>
        </header>
        <main>
          {(tab === 'schedule' || tab === 'builder') && <SchedulePage user={user} lang={lang} />}
          {tab === 'today' && <TodayPage user={user} lang={lang} />}
          {(tab === 'score' || tab === 'analytics') && <ScorePage user={user} lang={lang} />}
          {tab === 'review' && user.is_manager && <ReviewPage lang={lang} />}
          {tab === 'report' && user.is_manager && <ReportPage lang={lang} />}
          {tab === 'ai' && user.is_manager && <AiAssistantPage lang={lang} />}
          {tab === 'tasks' && user.is_manager && <TasksPage lang={lang} />}
          {tab === 'dashboard' && user.is_manager && <DashboardPage user={user} lang={lang} />}
          {tab === 'accounts' && user.is_manager && <AccountsPage user={user} lang={lang} />}
          {tab === 'profile' && <ProfilePage user={user} lang={lang} onLang={changeLang} onLogout={logout} onBack={() => setTab(user.is_manager ? 'dashboard' : 'today')} />}
        </main>
        <nav className="bottom-nav">
          {tabs.map(([k, icon]) => (
            <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
              <Icon name={icon} /><span>{L.nav[k]}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
