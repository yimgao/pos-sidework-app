import { useEffect, useState } from 'react'
import { clearToken, login, me, setToken } from './api'
import SchedulePage from './pages/SchedulePage'
import TodayPage from './pages/TodayPage'
import ReviewPage from './pages/ReviewPage'
import ScorePage from './pages/ScorePage'
import ReportPage from './pages/ReportPage'
import SuggestPage from './pages/SuggestPage'

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
  ['schedule', 'Schedule', '排班', 'schedule'],
  ['today', 'Today', '今日', 'today'],
  ['score', 'Score', '分数', 'score'],
]
const MANAGER = [
  ['review', 'Review', '复核', 'review'],
  ['report', 'Report', '报告', 'report'],
  ['suggest', 'Suggestions', '建议', 'suggest'],
]

export default function App() {
  const [user, setUser] = useState(null)
  const [pin, setPin] = useState('')
  const [msg, setMsg] = useState('')
  const [tab, setTab] = useState('schedule')
  useEffect(() => { if (localStorage.getItem('pos-token')) me().then(setUser).catch(() => clearToken()) }, [])
  if (!user) {
    return (
      <main className="login-wrap">
        <div className="card login-card">
          <div className="login-mark"><Icon name="schedule" /></div>
          <h1>Schedule · Sidework</h1>
          <p className="muted">Schedule &amp; Sidework, two independent modules 排班 · Sidework，两个独立模块</p>
          <input inputMode="numeric" placeholder="Enter PIN 输入 PIN" value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') document.getElementById('login-btn').click() }} />
          <button id="login-btn" className="btn login-btn" onClick={async () => {
            try { const d = await login(pin); setToken(d.token); setUser(d.user); setTab(d.user.is_manager ? 'schedule' : 'today') }
            catch (e) { setMsg(e.message) }
          }}>Enter 进入</button>
          <p className="muted">Demo PINs 演示 PIN：Manager 经理 123456 · Anna 1111 · Ben 2222 · Chris 3333</p>
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
        <div className="brand"><div className="brand-mark"><Icon name="schedule" /></div><div><b>Schedule · Sidework</b><small>排班 · Sidework</small></div></div>
        <p className="nav-label">My 我的</p>
        <nav className="side-nav">
          {COMMON.map(([k, label, sub, icon]) => (
            <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
              <Icon name={icon} /><span><b>{label}</b><small>{sub}</small></span>
            </button>
          ))}
        </nav>
        {user.is_manager && (<><p className="nav-label">Manager 经理</p><nav className="side-nav">
          {MANAGER.map(([k, label, sub, icon]) => (
            <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
              <Icon name={icon} /><span><b>{label}</b><small>{sub}</small></span>
            </button>
          ))}
        </nav></>)}
        <div className="user-card">
          <div className="avatar">{user.name.slice(0, 1)}</div>
          <div className="user-meta"><b>{user.name}</b><small>{user.is_manager ? 'Manager 经理' : 'Staff 员工'}</small></div>
          <button className="btn2" onClick={logout}>Logout 退出</button>
        </div>
      </aside>
      <div className="maincol">
        <header className="mobile-header"><b>Schedule · Sidework</b><span>{user.name}</span></header>
        <main>
          {tab === 'schedule' && <SchedulePage user={user} />}
          {tab === 'today' && <TodayPage user={user} />}
          {tab === 'score' && <ScorePage user={user} />}
          {tab === 'review' && user.is_manager && <ReviewPage />}
          {tab === 'report' && user.is_manager && <ReportPage />}
          {tab === 'suggest' && user.is_manager && <SuggestPage />}
        </main>
        <nav className="bottom-nav">
          {tabs.map(([k, label, sub, icon]) => (
            <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
              <Icon name={icon} /><span>{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
