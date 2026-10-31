import { useEffect, useState } from 'react'
import { markLate, pendingReview, reviewRecord, screenPhoto } from '../api'
import { dict, displayText } from '../i18n'

export default function ReviewPage({ lang }) {
  const L = dict(lang).review
  const [rows, setRows] = useState([])
  const [notes, setNotes] = useState({})
  const [screens, setScreens] = useState({})
  const [msg, setMsg] = useState('')
  const load = () => pendingReview().then(setRows).catch((e) => setMsg(e.message))
  useEffect(() => { load() }, [])
  if (!rows.length) return <div className="card"><h2>{L.title}</h2><p className="muted">{L.empty} {msg}</p></div>
  return (
    <div className="card">
      <h2>{L.title} ({L.module})</h2>
      <p className="muted">{msg}</p>
      {rows.map((r) => (
        <div className="task" key={r.id}>
          <b>{r.employee_name}</b> · {displayText(r.title, lang)} · {r.date} {r.late && <span className="tag warn">{L.late}</span>}
          {r.photo_url && <img className="thumb" src={r.photo_url} alt="" />}
          {r.file_name && <p className="muted">{L.file}：{r.file_name}</p>}
          <p className="muted">{L.note}：{r.note || L.none}</p>
          <input placeholder={L.rejectPlaceholder} value={notes[r.id] || ''} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
          {r.photo_url && <div>
            <button className="btn2" onClick={async () => { setScreens({ ...screens, [r.id]: L.screening }); try { const s = await screenPhoto(r.id, lang); setScreens({ ...screens, [r.id]: `${s.status} · ${s.reason}${s.model ? ' (' + s.model + ')' : ''}` }) } catch (e) { setScreens({ ...screens, [r.id]: e.message }) } }}>{L.screen}</button>
            {screens[r.id] && <p className="muted">{screens[r.id]}</p>}
          </div>}
          <div>
            <button className="btn green" onClick={async () => { await reviewRecord(r.id, { result: 'pass', note: notes[r.id] || '' }); load() }}>{L.approve}</button>
            <button className="btn red" onClick={async () => { try { await reviewRecord(r.id, { result: 'fail', note: notes[r.id] || '' }); load() } catch (e) { setMsg(e.message) } }}>{L.reject}</button>
            <button className="btn2" onClick={async () => { await markLate(r.id); load() }}>{L.markLate}</button>
          </div>
        </div>
      ))}
    </div>
  )
}
