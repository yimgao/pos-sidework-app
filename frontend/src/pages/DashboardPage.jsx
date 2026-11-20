// Live Operations: stat cards + per-person progress + flagged list.
// Uses only the data GET /api/dashboard already returns — no invented
// metrics (no fake deltas; completion etc. come straight from overview).
import { useEffect, useState } from 'react'
import { getDashboard, sendReport } from '../api'
import { dict } from '../i18n'
import { initials, roleAvatarColor, roleLabel, roleStyle } from '../roles'

export default function DashboardPage({ user, lang, onNavigate }) {
  const L = dict(lang).dashboard
  const [data, setData] = useState(null)
  const [msg, setMsg] = useState('')
  const [sendInfo, setSendInfo] = useState(null)
  const load = () => getDashboard('', lang).then(setData).catch((e) => setMsg(e.message))
  useEffect(() => { load() }, [])
  if (!data) return <div className="card" role="status">{msg || dict(lang).loading}</div>
  const o = data.overview
  return (
    <div>
      <div className="page-head">
        <h2>{L.title} · {data.date}</h2>
        {msg && <p className="muted">{msg}</p>}
      </div>
      <div className="stat-grid dashboard-stats">
        <div className="stat-card">

          <div className="stat-label">{L.completion}</div>
          <div className="stat-value">{o.completion ?? '—'}%</div>
          <div className="stat-sub">{o.done}/{o.total} {L.doneItems}</div>
        </div>
        <div className="stat-card">

          <div className="stat-label">{L.pendingReview}</div>
          <div className="stat-value">{o.pending_review}</div>
          <div className="stat-sub">{o.staff_count} {lang === 'zh' ? '名员工' : 'staff'}</div>
        </div>
        <div className="stat-card">

          <div className="stat-label">{L.late}</div>
          <div className="stat-value">{o.late}</div>
          <div className="stat-sub">{lang === 'zh' ? '今日迟交' : 'late today'}</div>
        </div>
        <div className="stat-card">

          <div className="stat-label">{L.lowCount}</div>
          <div className="stat-value">{o.low_count}</div>
          <div className="stat-sub">{L.flagged}</div>
        </div>
      </div>

      <div className="dashboard-body">
      <section className="card dashboard-attention">
        <h3 style={{ marginTop: 0 }}>{dict(lang).responsive.attention}</h3>
        <div className="attention-count"><b>{o.pending_review}</b><span className="muted">{L.pendingReview}</span></div>
        <button className="btn" onClick={() => onNavigate('review')}>{dict(lang).responsive.reviewAction}</button>
        <h3>{L.flagged}</h3>
        {data.watchlist.length ? data.watchlist.map((p) => (
          <div key={p.name} style={{ padding: '8px 0', borderTop: '1px solid var(--border)' }}>
            <b>{p.name}</b> — {L.score} <span className="error">{p.score}</span>
          </div>
        )) : <p className="muted">{dict(lang).responsive.noFlags}</p>}
      </section>
      <div className="card dashboard-people">
        <h3 style={{ marginTop: 0 }}>{L.perPerson}</h3>
        {data.people.map((p) => {
          const pct = p.total ? Math.round((p.done / p.total) * 100) : 0
          return (
            <div className="tpl-row" key={p.id}>
              <div className="avatar" style={{ background: roleAvatarColor(p.role), color: '#fff' }}>{initials(p.name)}</div>
              <div className="tpl-body">
                <b>{p.name}</b>{' '}
                <span className="pill" style={roleStyle(p.role)}>{roleLabel(p.role)}</span>{' '}
                {p.not_assigned && <span className="tag">{lang === 'zh' ? '未分配' : 'Not assigned'}</span>}
                <span className="muted"> · {L.done} {p.done}/{p.total} · {L.score} {p.score ?? '—'}</span>
                {p.total > 0 && (
                  <div className="progress"><i style={{ width: pct + '%', background: p.score !== null && p.score !== undefined && p.score < 70 ? '#DC2626' : '#16A34A' }} /></div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="dashboard-segments">
        <div className="card">
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
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{L.timeline}</h3>
          {data.timeline.map((t, i) => <div key={i} style={{ padding: '4px 0' }}>{t.at?.slice(11, 16)} {t.employee} — {t.title} {t.late ? '· Late' : ''}</div>)}
        </div>
      </div>

      </div>
      <details className="card dashboard-reports">
        <summary>{L.personReports}</summary>
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
      </details>
    </div>
  )
}
