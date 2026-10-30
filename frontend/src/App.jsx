import { useEffect, useState } from 'react'
import { clearToken, login, me, setToken } from './api'
import SchedulePage from './pages/SchedulePage'
import TodayPage from './pages/TodayPage'
import ReviewPage from './pages/ReviewPage'
import ScorePage from './pages/ScorePage'
import ReportPage from './pages/ReportPage'
import SuggestPage from './pages/SuggestPage'

export default function App() {
  const [user, setUser] = useState(null)
  const [pin, setPin] = useState('')
  const [msg, setMsg] = useState('')
  const [tab, setTab] = useState('schedule')
  useEffect(() => { if (localStorage.getItem('pos-token')) me().then(setUser).catch(() => clearToken()) }, [])
  if (!user) {
    return (
      <main>
        <div className="card">
          <h2>登录</h2>
          <p className="muted">演示 PIN：经理 123456 · Anna 1111 · Ben 2222 · Chris 3333</p>
          <input inputMode="numeric" placeholder="输入 PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
          <button className="btn" onClick={async () => {
            try { const d = await login(pin); setToken(d.token); setUser(d.user); setTab(d.user.is_manager ? 'schedule' : 'today') }
            catch (e) { setMsg(e.message) }
          }}>进入</button>
          <p className="muted">{msg}</p>
        </div>
      </main>
    )
  }
  const tabs = [
    ['schedule', '排班'],
    ['today', '今日'],
    ['score', '分数'],
  ]
  if (user.is_manager) tabs.push(['review', '复核'], ['report', '报告'], ['suggest', '建议'])
  const navButtons = (cls) => (
    <nav className={cls}>
      {tabs.map(([k, label]) => <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{label}</button>)}
    </nav>
  )
  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>排班 + Sidework</h1>
        <p className="muted">两个单独模块：排班 · Sidework 检查 · 交点是表现分 → 排班建议</p>
        {navButtons('side-nav')}
      </aside>
      <div className="maincol">
        <header><h1>排班 + Sidework</h1><p>当前：{user.name}{user.is_manager ? '（经理）' : '（员工）'} <button className="btn2" onClick={() => { clearToken(); setUser(null) }}>退出</button></p></header>
        <main>
          {tab === 'schedule' && <SchedulePage user={user} />}
          {tab === 'today' && <TodayPage user={user} />}
          {tab === 'score' && <ScorePage user={user} />}
          {tab === 'review' && user.is_manager && <ReviewPage />}
          {tab === 'report' && user.is_manager && <ReportPage />}
          {tab === 'suggest' && user.is_manager && <SuggestPage />}
        </main>
        {navButtons('bottom-nav')}
      </div>
    </div>
  )
}
