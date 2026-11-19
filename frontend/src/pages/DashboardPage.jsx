// Live Operations: stat cards + per-person progress + flagged list.
// Uses only the data GET /api/dashboard already returns — no invented
// metrics (no fake deltas; completion etc. come straight from overview).
import { useEffect, useState } from 'react'
import { getDashboard, sendReport } from '../api'
import { dict } from '../i18n'
import { initials, roleAvatarColor, roleLabel, roleStyle } from '../roles'

function StatIcon({ bg, children }) {
  return <div className="stat-icon" style={{ background: bg }}>{children}</div>
}

export default function DashboardPage({ user, lang }) {
  const L = dict(lang).dashboard
  const [data, setData] = useState(null)
  const [msg, setMsg] = useState('')
  const [sendInfo, setSendInfo] = useState(null)
  const load = () => getDashboard('', lang).then(setData).catch((e) => setMsg(e.message))
  useEffect(() => { load() }, [])
  if (!data) return <div className="card">{dict(lang).loading}</div>
  const o = data.overview
  return (
    <div>
      <div className="page-head">
        <h2>{L.title} · {data.date}</h2>
        {msg && <p className="muted">{msg}</p>}
      </div>
      <div className="stat-grid">
        <div className="stat-card">
          <StatIcon bg="#EEF2FF"><span style={{ color: '#4F46E5', fontSize: 20 }}>✓</span></StatIcon>
          <div className="stat-label">{L.completion}</div>
          <div className="stat-value">{o.completion ?? '—'}%</div>
          <div className="stat-sub">{o.done}/{o.total} {L.doneItems}</div>
        </div>
        <div className="stat-card">
          <StatIcon bg="#FEF3C7"><span style={{ color: '#D97706', fontSize: 20 }}>◷</span></StatIcon>
          <div className="stat-label">{L.pendingReview}</div>
          <div className="stat-value">{o.pending_review}</div>
          <div className="stat-sub">{o.staff_count} {lang === 'zh' ? '名员工' : 'staff'}</div>
        </div>
        <div className="stat-card">
          <StatIcon bg="#FDE2E2"><span style={{ color: '#DC2626', fontSize: 20 }}>!</span></StatIcon>
          <div className="stat-label">{L.late}</div>
          <div className="stat-value">{o.late}</div>
          <div className="stat-sub">{lang === 'zh' ? '今日迟交' : 'late today'}</div>
        </div>
        <div className="stat-card">
          <StatIcon bg="#EDE9FE"><span style={{ color: '#6D28D9', fontSize: 20 }}>⚑</span></StatIcon>
          <div className="stat-label">{L.lowCount}</div>
          <div className="stat-value">{o.low_count}</div>
          <div className="stat-sub">{L.flagged}</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{L.perPerson}</h3>
        {data.people.map((p) => {
          const pct = p.total ? Math.round((p.done / p.total) * 100) : 0
          return (
            <div className="tpl-row" key={p.id}>
              <div className="avatar" style={{ background: roleAvatarColor(p.role), color: '#fff' }}>{initials(p.name)}</div>
              <div className="tpl-body">
                <b>{p.name}</b>{' '}
                <span className="pill" style={roleStyle(p.role)}>{roleLabel(p.role)}</span>{' '}
                {p.not_assigned && <span className="tag">Not assigned</span>}
                <span className="muted"> · {L.done} {p.done}/{p.total} · {L.score} {p.score ?? '—'}</span>
                {p.total > 0 && (
                  <div className="progress"><i style={{ width: pct + '%', background: p.score !== null && p.score !== undefined && p.score < 70 ? '#DC2626' : '#16A34A' }} /></div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: 260 }}>
          <h3 style={{ marginTop: 0 }}>{L.bySegment}</h3>
          {Object.entries(data.by_segment).map(([seg, v]) => (
            <div key={seg} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{L[seg]}</span><span className="muted">{v.done}/{v.total} ({v.rate ?? '—'}%)</span></div>
              <div className="progress"><i style={{ width: (v.rate || 0) + '%' }} /></div>
            </div>
          ))}
          <h3>{L.leaderboard}</h3>
          {data.leaderboard.map((p, i) => <div key={p.name}>{i + 1}. {p.name} — {p.score}</div>)}
        </div>
        <div className="card" style={{ flex: 1, minWidth: 260 }}>
          <h3 style={{ marginTop: 0 }}>{L.flagged}</h3>
          {data.watchlist.length ? data.watchlist.map((p) => (
            <div key={p.name} style={{ padding: '8px 0', borderTop: '1px solid #F3F4F6' }}>
              <span style={{ color: '#DC2626' }}>●</span> <b>{p.name}</b> — {L.score} {p.score}
            </div>
          )) : <p className="muted">—</p>}
          <h3>{L.timeline}</h3>
          {data.timeline.map((t, i) => <div key={i} style={{ padding: '4px 0' }}>{t.at?.slice(11, 16)} {t.employee} — {t.title} {t.late ? '· Late' : ''}</div>)}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{L.personReports}</h3>
        {!data.manager_sees_person_reports && !user.is_owner && <p className="muted">{L.managerHidden}</p>}
        {data.person_reports.map((r) => (
          <div className="task" key={r.employee_id}>
            <b>{r.name}</b> — {r.summary}
            <div>{L.doneItems}：{r.done.join('、') || '—'}</div>
            <div>{L.missedItems}：{r.missed.join('、') || '—'}</div>
            <div>{L.improve}：{r.improvements.join('；')}</div>
          </div>
        ))}
        <button className="btn" onClick={async () => {
          try { const r = await sendReport('', lang); setSendInfo(r); setMsg(r.email?.sent || r.sms?.sent ? L.sent : L.preview) } catch (e) { setMsg(e.message) }
        }}>{L.send}</button>
        {sendInfo && <p className="muted">Email: {sendInfo.email?.sent ? 'sent' : 'preview'} · SMS: {sendInfo.sms?.sent ? 'sent' : 'preview'}</p>}
      </div>
    </div>
  )
}
