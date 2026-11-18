import { useEffect, useState } from 'react'
import { getDashboard, sendReport } from '../api'
import { dict } from '../i18n'

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
    <div className="card">
      <h2>{L.title} · {data.date}</h2>
      <p className="muted">{msg}</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div className="task"><b>{L.completion}</b><div>{o.completion ?? '—'}% ({o.done}/{o.total})</div></div>
        <div className="task"><b>{L.pendingReview}</b><div>{o.pending_review}</div></div>
        <div className="task"><b>{L.late}</b><div>{o.late}</div></div>
        <div className="task"><b>{L.lowCount}</b><div>{o.low_count}</div></div>
      </div>
      <h3>{L.perPerson}</h3>
      {data.people.map((p) => (
        <div className="task" key={p.id}>
          <b>{p.name}</b> · {p.role} · {L.done} {p.done}/{p.total} · {L.score} {p.score ?? '—'} · {L.rolling} {p.rolling ?? '—'}
          {p.score !== null && p.score !== undefined && (
            <div style={{ background: '#E5E5EA', borderRadius: 6, height: 10, marginTop: 4 }}>
              <div style={{ width: Math.min(100, p.score) + '%', background: p.score < 70 ? '#FF3B30' : '#34C759', height: 10, borderRadius: 6 }} />
            </div>
          )}
          {p.not_assigned && <span className="tag">Not assigned</span>}
        </div>
      ))}
      <h3>{L.bySegment}</h3>
      {Object.entries(data.by_segment).map(([seg, v]) => (
        <div key={seg}>{L[seg]}：{v.done}/{v.total}（{v.rate ?? '—'}%）</div>
      ))}
      <h3>{L.leaderboard}</h3>
      {data.leaderboard.map((p, i) => <div key={p.name}>{i + 1}. {p.name} — {p.score}</div>)}
      <h3>{L.watchlist}</h3>
      {data.watchlist.length ? data.watchlist.map((p) => <div key={p.name}>{p.name} — {p.score}</div>) : <p className="muted">—</p>}
      <h3>{L.timeline}</h3>
      {data.timeline.map((t, i) => <div key={i}>{t.at?.slice(11, 16)} {t.employee} — {t.title} {t.late ? '· Late' : ''}</div>)}
      <h3>{L.personReports}</h3>
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
  )
}
