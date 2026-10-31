import { useEffect, useState } from 'react'
import { completeTask, myToday } from '../api'
import { dict, displayText } from '../i18n'

export default function TodayPage({ user, lang }) {
  const L = dict(lang).today
  const loading = dict(lang).loading
  const [data, setData] = useState(null)
  const [files, setFiles] = useState({})
  const [notes, setNotes] = useState({})
  const [msg, setMsg] = useState('')
  const load = () => myToday().then(setData).catch((e) => setMsg(e.message))
  useEffect(() => { load() }, [])
  if (user.is_manager) return <div className="card"><h2>{L.title}</h2><p className="muted">{L.managerNote}</p></div>
  if (!data) return <div className="card">{loading}</div>
  let cur = ''
  return (
    <div className="card">
      <h2>{L.title}：{user.name} · {data.date}</h2>
      <p className="muted">{data.assigned_mode ? L.assignedNote : L.allNote}</p>
      <p className="muted">{L.photoNote} {msg}</p>
      {!data.items.length && <p className="muted">{data.assigned_mode ? L.assignedNote : ''}</p>}
      {data.items.map((it) => {
        const grp = it.group_letter || 'A'
        const head = grp !== cur ? (cur = grp, <h3 key={'h' + grp}>{L.group} {grp}</h3>) : null
        const status = it.status === 'done' && it.review === 'pass' ? <span className="tag ok">{L.approved}</span>
          : it.status === 'done' && it.review === 'fail' ? <span className="tag bad">{L.rejected}：{it.review_note}</span>
          : it.status === 'done' ? <span className="tag warn">{L.pendingReview}</span> : <span className="tag">{L.pending}</span>
        return (
          <div key={it.template_id}>
            {head}
            <div className="task">
              <b>{displayText(it.title, lang)}</b> {it.requires_photo && <span className="tag">{L.photoRequired}</span>} {status}
              <div><input type="file" accept="image/*,video/*" onChange={(e) => setFiles({ ...files, [it.template_id]: e.target.files[0] })} /></div>
              {it.photo_url && <img className="thumb" src={it.photo_url} alt="" />}
              {it.file_name && <p className="muted">{L.uploadedFile}：{it.file_name}</p>}
              <input placeholder={L.notePlaceholder} value={notes[it.template_id] ?? it.note} onChange={(e) => setNotes({ ...notes, [it.template_id]: e.target.value })} />
              <button className="btn" onClick={async () => {
                const form = new FormData()
                form.append('template_id', it.template_id)
                form.append('note', notes[it.template_id] ?? it.note ?? '')
                if (files[it.template_id]) form.append('file', files[it.template_id])
                try { await completeTask(form); setMsg(lang === 'zh' ? '已提交，等待经理复核。' : 'Submitted, waiting for manager review.'); load() } catch (e) { setMsg(e.message) }
              }}>{L.markComplete}</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
