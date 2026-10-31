import { useEffect, useState } from 'react'
import { applySuggestion, mondayOf, scheduleSuggestion, scheduleWeek, todayStr } from '../api'
import { dict, displayText } from '../i18n'

function nextMonday() {
  const m = new Date(mondayOf())
  m.setDate(m.getDate() + 7)
  return m.toISOString().slice(0, 10)
}

export default function SuggestPage({ lang }) {
  const L = dict(lang).suggest
  const [rows, setRows] = useState([])
  const [edits, setEdits] = useState({})
  const [weekShifts, setWeekShifts] = useState([])
  const [msg, setMsg] = useState('')
  const [week, setWeek] = useState(nextMonday())

  useEffect(() => { scheduleSuggestion(todayStr(), lang).then((r) => {
    setRows(r)
    const init = {}
    r.forEach((x) => { init[x.employee_id] = { action: x.suggestion, date: week, shiftId: '' } })
    setEdits(init)
  }).catch(() => {}) }, [lang])
  useEffect(() => { scheduleWeek(week).then((r) => setWeekShifts(r.filter((s) => s.status !== 'cancelled'))).catch(() => {}) }, [week])

  const setEdit = (id, patch) => setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  return (
    <div className="card">
      <h2>{L.title}</h2>
      <p className="muted">{L.note}</p>
      <p className="muted">{msg}</p>
      <label>{L.week} <input type="date" value={week} onChange={(e) => setWeek(e.target.value)} /></label>
      {rows.map((r) => {
        const e = edits[r.employee_id] || { action: r.suggestion, date: week, shiftId: '' }
        const shifts = weekShifts.filter((s) => s.employee_id === r.employee_id)
        return (
          <div className="task" key={r.employee_id}>
            <b>{r.name}</b> · {L.score}: {r.score} · {L.suggestion}: {r.label}
            <div>
              <select value={e.action} onChange={(ev) => setEdit(r.employee_id, { action: ev.target.value })}>
                <option value="keep">{L.keep}</option>
                <option value="talk">{L.talk}</option>
                <option value="minus_half_day">{L.reduceHalf}</option>
                <option value="minus_one_day">{L.reduceDay}</option>
              </select>
            </div>
            {(e.action === 'minus_half_day' || e.action === 'minus_one_day') && (
              <div>
                <label>{L.date} <input type="date" value={e.date} onChange={(ev) => setEdit(r.employee_id, { date: ev.target.value })} /></label>
                {e.action === 'minus_half_day' && (
                  <select value={e.shiftId} onChange={(ev) => setEdit(r.employee_id, { shiftId: ev.target.value })}>
                    <option value="">{shifts.length ? L.shift : L.noShift}</option>
                    {shifts.map((s) => <option key={s.id} value={s.id}>{s.date} · {displayText(s.shift, lang)} {s.start_time}–{s.end_time}</option>)}
                  </select>
                )}
              </div>
            )}
            <button className="btn" onClick={async () => {
              try {
                const body = { employee_id: r.employee_id, action: e.action, week_start: week }
                if (e.action === 'minus_one_day') body.date = e.date
                if (e.action === 'minus_half_day') { body.date = e.date; if (e.shiftId) body.shift_id = Number(e.shiftId) }
                const res = await applySuggestion(body)
                setMsg(`${L.applied}: ${r.name} — ${res.cancelled.length} ${L.cancelled}`)
                scheduleWeek(week).then((x) => setWeekShifts(x.filter((s) => s.status !== 'cancelled'))).catch(() => {})
              } catch (err) { setMsg(err.message) }
            }}>{L.adopt}</button>
          </div>
        )
      })}
    </div>
  )
}
