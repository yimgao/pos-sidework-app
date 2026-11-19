// Employee Today: BrewLab checklist cards, one per segment.
// Every task needs a photo AND a note to complete — checked here first
// (clear message) and enforced again by POST /api/sidework/complete.
import { useEffect, useState } from 'react'
import { completeTask, myToday } from '../api'
import { dict, displayText } from '../i18n'
import { roleLabel, roleStyle } from '../roles'

const SEGMENTS = ['opening', 'midday', 'evening']

function CheckItem({ it, lang, files, setFiles, notes, setNotes, onDone }) {
  const L = dict(lang).today
  const done = it.status === 'done'
  const failed = done && it.review === 'fail'
  const noteVal = notes[it.template_id] ?? it.note ?? ''
  const hasPhoto = !!files[it.template_id] || !!it.photo_url
  return (
    <div className="check-item">
      <div className="check-row">
        <div className={'check-circle' + (done && !failed ? ' done' : '')}>{done && !failed ? '✓' : ''}</div>
        <div className="check-body">
          <b className={done && !failed ? 'done-title' : ''}>{displayText(it.title, lang)}</b>{' '}
          <span className="pill" style={roleStyle(it.role)}>{roleLabel(it.role, L.allRoles)}</span>{' '}
          {it.optional && <span className="tag">{L.optional}</span>}{' '}
          {done && it.review === 'pass' && <span className="tag ok">{L.approved}</span>}
          {failed && <span className="tag bad">{L.rejected}：{it.review_note}</span>}
          {done && !it.review && <span className="tag warn">{L.pendingReview}</span>}
          {!done && <span className="tag">{L.pending}</span>}
          {it.standard && <p className="standard">{L.standard}：{it.standard}</p>}
          {done && !failed && (
            <>
              {it.photo_url && <img className="thumb" src={it.photo_url} alt="" />}
              {it.file_name && <p className="muted">{L.uploadedFile}：{it.file_name}</p>}
              {it.note && <p className="muted">{it.note}</p>}
              {it.completed_at && <p className="completed-line">✓ {L.completedAt} {it.completed_at.slice(11, 16)}</p>}
            </>
          )}
          {(!done || failed) && (
            <>
              <div><input type="file" accept="image/*,video/*" onChange={(e) => setFiles({ ...files, [it.template_id]: e.target.files[0] })} /></div>
              {it.photo_url && <img className="thumb" src={it.photo_url} alt="" />}
              {it.file_name && <p className="muted">{L.uploadedFile}：{it.file_name}</p>}
              <input placeholder={L.notePlaceholder} value={noteVal} onChange={(e) => setNotes({ ...notes, [it.template_id]: e.target.value })} />
              <button className="btn" onClick={() => onDone(it, noteVal, hasPhoto)}>{L.markComplete}</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

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

  const onDone = async (it, noteVal, hasPhoto) => {
    if (!hasPhoto) { setMsg(L.photoRequiredMsg); return }
    if (!noteVal.trim()) { setMsg(L.noteRequiredMsg); return }
    const form = new FormData()
    form.append('template_id', it.template_id)
    form.append('note', noteVal)
    if (files[it.template_id]) form.append('file', files[it.template_id])
    try { await completeTask(form); setMsg(lang === 'zh' ? '已提交，等待经理复核。' : 'Submitted, waiting for manager review.'); load() } catch (e) { setMsg(e.message) }
  }

  const groups = SEGMENTS
    .map((seg) => ({ seg, items: data.items.filter((it) => (it.segment || 'opening') === seg) }))
    .filter((g) => g.items.length)
  return (
    <div>
      <div className="page-head">
        <h2>{L.title}：{user.name} · {data.date}</h2>
        <p className="muted">{L.subtitle}</p>
        <p className="muted">{data.assigned_mode ? L.assignedNote : L.allNote}</p>
        <p className="muted">{L.photoNote}</p>
        {msg && <p className="muted error">{msg}</p>}
      </div>
      {!data.items.length && <div className="card"><p className="muted">{data.assigned_mode ? L.assignedNote : ''}</p></div>}
      {groups.map(({ seg, items }) => {
        const doneCount = items.filter((i) => i.status === 'done').length
        const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0
        return (
          <div className="card check-card" key={seg}>
            <div className="check-head">
              <div>
                <b>{L.segments[seg] || seg}{seg === 'midday' ? ` (${L.optional})` : ''}</b>
                <div className="muted">{doneCount} of {items.length} {L.completeWord}</div>
              </div>
              <span className="muted">{pct}%</span>
            </div>
            <div className="progress"><i style={{ width: pct + '%' }} /></div>
            {items.map((it) => (
              <CheckItem key={it.template_id} it={it} lang={lang} files={files} setFiles={setFiles} notes={notes} setNotes={setNotes} onDone={onDone} />
            ))}
          </div>
        )
      })}
    </div>
  )
}
