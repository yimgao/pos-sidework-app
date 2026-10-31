import { useEffect, useState } from 'react'
import { allScores, listEmployees, mondayOf, myScore, pendingReview, scheduleWeek } from '../api'
import { dict } from '../i18n'

// User's own profile. Language switch lives ONLY here.
// Employee sees: own account, own score, own week, own permissions.
// Manager sees: own account, team overview, manager permissions.
// Fields the system does not have yet (phone, emergency contact, hire date, pay)
// are shown as "not set yet" — never faked.
export default function ProfilePage({ user, lang, onLang, onLogout, onBack }) {
  const L = dict(lang)
  const P = L.profile
  const [score, setScore] = useState(null)
  const [weekCount, setWeekCount] = useState(null)
  const [team, setTeam] = useState(null)
  useEffect(() => {
    if (user.is_manager) {
      Promise.all([listEmployees().catch(() => []), pendingReview().catch(() => []), allScores().catch(() => [])])
        .then(([emps, pending, scores]) => setTeam({ staff: emps.filter((e) => !e.is_manager && e.is_active !== false).length, pending: pending.length, scores }))
        .catch(() => {})
    } else {
      myScore().then(setScore).catch(() => {})
      scheduleWeek(mondayOf()).then((rows) => setWeekCount(rows.length)).catch(() => {})
    }
  }, [user])

  return (
    <div className="card">
      <button className="btn2" onClick={onBack}>← {P.back}</button>
      <h2 style={{ marginTop: 12 }}>{P.title}</h2>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '12px 0' }}>
        <div className="avatar" style={{ width: 48, height: 48, fontSize: 20 }}>{user.name.slice(0, 1)}</div>
        <div><b style={{ fontSize: 18 }}>{user.name}</b><p className="muted" style={{ margin: 0 }}>{user.is_manager ? L.manager : L.staff} · {user.role}</p></div>
      </div>

      <div className="card" style={{ margin: '0 0 16px' }}>
        <h3 style={{ marginTop: 0 }}>{P.account}</h3>
        <p>{P.role}：{user.is_manager ? L.manager : L.staff} ({user.role})</p>
        <p>{P.loginMethod}：{P.pinLogin}</p>
        <p>{P.status}：{P.active}</p>
        <p className="muted">{P.phone}：{P.future} · {P.emergency}：{P.future} · {P.hireDate}：{P.future}{user.is_manager ? ` · ${P.payRate}：${P.future}` : ''}</p>
        <p className="muted">{user.is_manager ? (lang === 'zh' ? '你是经理，员工的姓名和身份由你来定。' : 'You are the manager — you set staff names and roles.') : (lang === 'zh' ? '姓名和身份由经理改，自己改不了，改的话找经理。' : 'Name and role are set by the manager. Ask your manager to change them.')}</p>
      </div>

      {!user.is_manager && (
        <div className="card" style={{ margin: '0 0 16px' }}>
          <h3 style={{ marginTop: 0 }}>{P.myScore}</h3>
          {score ? <p>{dict(lang).score.todayScore}：<b>{score.score}</b> · {P.completed} {score.done}/{score.total} · {P.reviewed} {score.reviewed} · {P.passed} {score.passed}</p> : <p className="muted">{dict(lang).loading}</p>}
          <h3>{P.myWeek}</h3>
          <p>{weekCount === null ? dict(lang).loading : `${weekCount} ${P.publishedShifts}`}</p>
        </div>
      )}

      {user.is_manager && team && (
        <div className="card" style={{ margin: '0 0 16px' }}>
          <h3 style={{ marginTop: 0 }}>{P.team}</h3>
          <p>{team.staff} {P.activeStaff} · {team.pending} {P.pendingReviews}</p>
          <p className="muted">{P.teamScoreNote}</p>
        </div>
      )}

      <div className="card" style={{ margin: '0 0 16px' }}>
        <h3 style={{ marginTop: 0 }}>{P.language}</h3>
        <p className="muted">{P.languageNote}</p>
        <div className="lang-switch large">
          <button className={lang === 'en' ? 'active' : ''} onClick={() => onLang('en')}>EN</button>
          <button className={lang === 'zh' ? 'active' : ''} onClick={() => onLang('zh')}>中文</button>
        </div>
      </div>

      <div className="card" style={{ margin: 0 }}>
        <h3 style={{ marginTop: 0 }}>{P.canDo}</h3>
        <ul>{(user.is_manager ? P.mgrCan : P.empCan).map((x) => <li key={x}>{x}</li>)}</ul>
        <h3>{P.cannotDo}</h3>
        <ul>{(user.is_manager ? P.mgrCannot : P.empCannot).map((x) => <li key={x}>{x}</li>)}</ul>
      </div>

      <button className="btn red" style={{ marginTop: 16 }} onClick={onLogout}>{L.logout}</button>
    </div>
  )
}
