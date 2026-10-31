import { useEffect, useState } from 'react'
import { approveDraft, createDraft, listDrafts, rejectDraft, removeDraftEntry } from '../api'
import { dict } from '../i18n'
import { mondayOf } from '../api'

export default function DraftPage({ lang }) {
  const L = dict(lang).draft
  const [req, setReq] = useState('Anna Wednesday Dinner, Ben Friday Lunch')
  const [week, setWeek] = useState(mondayOf())
  const [drafts, setDrafts] = useState([])
  const [msg, setMsg] = useState('')
  const load = () => listDrafts().then(setDrafts).catch((e) => setMsg(e.message))
  useEffect(() => { load() }, [])
  return (
    <div className="card">
      <h2>{L.title}</h2>
      <p className="muted">{L.note}</p>
      <p className="muted">{msg}</p>
      <input placeholder={L.requirementPlaceholder} value={req} onChange={(e) => setReq(e.target.value)} />
      <input type="date" value={week} onChange={(e) => setWeek(e.target.value)} />
      <button className="btn" onClick={async () => { try { await createDraft({ requirement: req, week_start: week, lang }); setMsg(''); load() } catch (e) { setMsg(e.message) } }}>{L.generate}</button>
      {!drafts.length && <p className="muted">{L.empty}</p>}
      {drafts.map((d) => (
        <div className="task" key={d.id}>
          <b>{L.status}: {d.status}</b> · {d.week_start} · {d.requirement_text}
          {d.warnings.map((w, i) => <p key={i} className="muted">{L.warnings}: {w}</p>)}
          {d.entries.map((e, i) => (
            <p key={i}>{e.employee_name} · {e.date} · {e.shift} — {L.reason}: {e.reason}
              {d.status === 'draft' && <button className="btn2" onClick={async () => { await removeDraftEntry(d.id, i); load() }}>{L.remove}</button>}
            </p>
          ))}
          {d.status === 'draft' && (
            <div>
              <button className="btn green" onClick={async () => { const r = await approveDraft(d.id); setMsg(L.approved + ' (' + r.created_drafts + ')'); load() }}>{L.approve}</button>
              <button className="btn red" onClick={async () => { await rejectDraft(d.id); setMsg(L.rejected); load() }}>{L.reject}</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
