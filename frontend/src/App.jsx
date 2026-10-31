import { useEffect, useState } from 'react'
import { clearToken, login, me, setToken } from './api'
import { dict, getLang, setLang } from './i18n'
import SchedulePage from './pages/SchedulePage'
import TodayPage from './pages/TodayPage'
import ReviewPage from './pages/ReviewPage'
import ScorePage from './pages/ScorePage'
import ReportPage from './pages/ReportPage'
import SuggestPage from './pages/SuggestPage'
import DraftPage from './pages/DraftPage'
import TasksPage from './pages/TasksPage'
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
  }
  return <svg {...p}>{paths[name]}</svg>
}

const COMMON = [
  ['schedule', 'schedule'],
  ['today', 'today'],
  ['score', 'score'],
]
const MANAGER = [
  ['review', 'review'],
  ['report', 'report'],
  ['suggest', 'suggest'],
  ['draft', 'suggest'],
  ['tasks', 'today'],
]

export default function App() {
  const [user, setUser] = useState(null)
  const [pin, setPin] = useState('')
  const [msg, setMsg] = useState('')
  const [tab, setTab] = useState('schedule')
  const [lang, setLangState] = useState(getLang())
  const changeLang = (l) => { setLang(l); setLangState(l) }
  const L = dict(lang)
  useEffect(() => { if (localStorage.getItem('pos-token')) me().then(setUser).catch(() => clearToken()) }, [])
  if (!user) {
    return (
      <main className="login-wrap">
        <div className="card login-card">
          <div className="login-mark"><Icon name="schedule" /></div>
          <h1>{L.login.title}</h1>
          <p className="muted">{L.appSub}</p>
          <input inputMode="numeric" placeholder={L.login.enterPin} value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') document.getElementById('login-btn').click() }} />
          <button id="login-btn" className="btn login-btn" onClick={async () => {
            try { const d = await login(pin); setToken(d.token); setUser(d.user); setTab(d.user.is_manager ? 'schedule' : 'today') }
            catch (e) { setMsg(lang === 'zh' ? 'PIN 不对' : 'Wrong PIN') }
          }}>{L.login.enter}</button>
          <p className="muted">{L.login.demo}</p>
          <p className="muted error">{msg}</p>
        </div>
      </main>
    )
  }
  const tabs = user.is_manager ? [...COMMON, ...MANAGER] : COMMON
  const logout = () => { clearToken(); setUser(null) }
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Icon name="schedule" /></div><div><b>{L.appName}</b><small>{lang === 'en' ? 'Schedule & Sidework' : '排班 · Sidework'}</small></div></div>
        <p className="nav-label">{L.my}</p>
        <nav className="side-nav">
          {COMMON.map(([k, icon]) => (
            <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
              <Icon name={icon} /><span><b>{L.nav[k]}</b></span>
            </button>
          ))}
        </nav>
        {user.is_manager && (<><p className="nav-label">{L.manager}</p><nav className="side-nav">
          {MANAGER.map(([k, icon]) => (
            <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
              <Icon name={icon} /><span><b>{L.nav[k]}</b></span>
            </button>
          ))}
        </nav></>)}
        <button className="user-card" onClick={() => setTab('profile')}>
          <div className="avatar">{user.name.slice(0, 1)}</div>
          <div className="user-meta"><b>{user.name}</b><small>{user.is_manager ? L.manager : L.staff} · {L.profile.title} ›</small></div>
        </button>
      </aside>
      <div className="maincol">
        <header className="mobile-header"><b>{L.appName}</b><button className="avatar-btn" onClick={() => setTab('profile')}>{user.name.slice(0, 1)}</button></header>
        <main>
          {tab === 'schedule' && <SchedulePage user={user} lang={lang} />}
          {tab === 'today' && <TodayPage user={user} lang={lang} />}
          {tab === 'score' && <ScorePage user={user} lang={lang} />}
          {tab === 'review' && user.is_manager && <ReviewPage lang={lang} />}
          {tab === 'report' && user.is_manager && <ReportPage lang={lang} />}
          {tab === 'suggest' && user.is_manager && <SuggestPage lang={lang} />}
          {tab === 'draft' && user.is_manager && <DraftPage lang={lang} />}
          {tab === 'tasks' && user.is_manager && <TasksPage lang={lang} />}
          {tab === 'profile' && <ProfilePage user={user} lang={lang} onLang={changeLang} onLogout={logout} onBack={() => setTab(user.is_manager ? 'schedule' : 'today')} />}
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
