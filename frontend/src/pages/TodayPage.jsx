// Employee Today: BrewLab checklist cards, one per segment.
// Item layout, top to bottom: standard reference photo ("how it should
// look") -> standard text -> your photos (multiple) -> notes -> big ☑️ button.
// Every task needs at least one photo AND a note to complete — checked here
// first (clear message) and enforced again by POST /api/sidework/complete.
import { useEffect, useState } from 'react'
import { addRecordPhotos, completeTask, myToday } from '../api'
import { dict, displayText } from '../i18n'
import { roleLabel, roleStyle } from '../roles'

const SEGMENTS = ['opening', 'midday', 'evening']

function CheckItem({ it, lang, files, setFiles, previews, setPreviews, notes, setNotes, onDone, onAddPhotos }) {
  const L = dict(lang).today
  const done = it.status === 'done'
  const failed = done && it.review === 'fail'
  const noteVal = notes[it.template_id] ?? it.note ?? ''
  const selected = files[it.template_id] || []
  const selectedPreviews = previews[it.template_id] || []
  const existingPhotos = it.photos || []
  const hasPhoto = selected.length > 0 || existingPhotos.length > 0 || !!it.photo_url
  const pickFiles = (list) => {
    const arr = [...list]
    setFiles((prev) => ({ ...prev, [it.template_id]: [...(prev[it.template_id] || []), ...arr] }))
    setPreviews((prev) => ({ ...prev, [it.template_id]: [...(prev[it.template_id] || []), ...arr.map((f) => URL.createObjectURL(f))] }))
  }
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
          {it.standard_photo_url && (
            <div className="std-photo">
              <p className="std-label">{L.standardPhoto}</p>
              <img src={it.standard_photo_url} alt="" />
            </div>
          )}
          {it.standard && <p className="standard">{L.standard}：{it.standard}</p>}
          {(existingPhotos.length > 0 || selectedPreviews.length > 0) && (
            <div className="photo-grid">
              {existingPhotos.map((p, i) => <img key={'old' + i} src={p.url} alt={p.file_name || ''} />)}
              {selectedPreviews.map((u, i) => <img key={'new' + i} src={u} alt="" />)}
            </div>
          )}
          {done && !failed && (
            <>
              {it.note && <p className="muted">{it.note}</p>}
              {it.completed_at && <p className="completed-line">✓ {L.completedAt} {it.completed_at.slice(11, 16)}</p>}
              {it.record_id && (
                <div style={{ marginTop: 8 }}>
                  <input type="file" accept="image/*,video/*" multiple onChange={(e) => { if (e.target.files.length) onAddPhotos(it, e.target.files); e.target.value = '' }} />
                  <p className="muted">{L.addMorePhotos} · {L.photosHint}</p>
                </div>
              )}
            </>
          )}
          {(!done || failed) && (
            <>
              <p className="std-label">{L.yourPhotos}</p>
              <div><input type="file" accept="image/*,video/*" multiple onChange={(e) => { if (e.target.files.length) pickFiles(e.target.files); e.target.value = '' }} /></div>
              <p className="muted">{L.photosHint}</p>
              <input placeholder={L.notePlaceholder} value={noteVal} onChange={(e) => setNotes({ ...notes, [it.template_id]: e.target.value })} />
              <button className="btn btn-complete" onClick={() => onDone(it, noteVal, hasPhoto)}>{L.completeBtn}</button>
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
  const [previews, setPreviews] = useState({})
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
    ;(files[it.template_id] || []).forEach((f) => form.append('files', f))
    try {
      await completeTask(form)
      setFiles((p) => ({ ...p, [it.template_id]: [] }))
      setPreviews((p) => ({ ...p, [it.template_id]: [] }))
      setMsg(lang === 'zh' ? '已提交，等待经理复核。' : 'Submitted, waiting for manager review.'); load()
    } catch (e) { setMsg(e.message) }
  }

  const onAddPhotos = async (it, fileList) => {
    const form = new FormData()
    ;[...fileList].forEach((f) => form.append('files', f))
    try { await addRecordPhotos(it.record_id, form); setMsg(L.photosAdded); load() } catch (e) { setMsg(e.message) }
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
              <CheckItem key={it.template_id} it={it} lang={lang} files={files} setFiles={setFiles} previews={previews} setPreviews={setPreviews} notes={notes} setNotes={setNotes} onDone={onDone} onAddPhotos={onAddPhotos} />
            ))}
          </div>
        )
      })}
    </div>
  )
}
