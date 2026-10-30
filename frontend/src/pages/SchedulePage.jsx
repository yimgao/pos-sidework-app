import { useEffect, useState } from 'react'
import { createSchedule, listEmployees, mondayOf, publishSchedule, scheduleWeek, shiftTemplates } from '../api'
import { dict, displayText } from '../i18n'

export default function SchedulePage({ user, lang }) {
  const L = dict(lang).schedule
  const [rows, setRows] = useState([])
  const [employees, setEmployees] = useState([])
  const [templates, setTemplates] = useState([])
  const [week, setWeek] = useState(mondayOf())
  const [newEmp, setNewEmp] = useState('')
  const [newShift, setNewShift] = useState('')
  const [newDate, setNewDate] = useState(mondayOf())
  const [msg, setMsg] = useState('')

  const load = () => {
    listEmployees().then((list) => {
      setEmployees(list)
      if (!newEmp && list.filter((e) => !e.is_manager)[0]) setNewEmp(list.filter((e) => !e.is_manager)[0].id)
    }).catch(() => {})
    shiftTemplates().then((list) => {
      setTemplates(list)
      if (!newShift && list[0]) setNewShift(list[0].id)
    }).catch(() => {})
    scheduleWeek(week).then(setRows).catch(() => {})
  }
  useEffect(() => { load() }, [week])

  return (
    <div className="card">
      <h2>{L.title}</h2>
      <p className="muted">{L.module}. {L.weekStarting}: {week}. {L.newDraftNote} {msg}</p>
      <input type="date" value={week} onChange={(e) => setWeek(e.target.value)} />
      {user.is_manager && (
        <div className="card">
          <h3>{L.addTitle}</h3>
          <select value={newEmp} onChange={(e) => setNewEmp(e.target.value)}>
            {employees.filter((e) => !e.is_manager).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select value={newShift} onChange={(e) => setNewShift(e.target.value)}>
            {templates.map((t) => <option key={t.id} value={t.id}>{displayText(t.name, lang)} {t.start_time}-{t.end_time}</option>)}
          </select>
          <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <button className="btn" onClick={async () => {
            try { await createSchedule({ employee_id: Number(newEmp), shift_template_id: Number(newShift), date: newDate }); setMsg(lang === 'zh' ? '已新增，未发布。' : 'Added as draft.'); load() }
            catch (e) { setMsg(e.message) }
          }}>{L.add}</button>
          <button className="btn" onClick={async () => {
            try { const r = await publishSchedule(week); setMsg(lang === 'zh' ? `已发布 ${r.published} 条。` : `Published ${r.published} shifts.`); load() }
            catch (e) { setMsg(e.message) }
          }}>{L.publish}</button>
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>{L.employee}</th>{L.days.map((d) => <th key={d}>{d}</th>)}</tr></thead>
          <tbody>
            {employees.filter((e) => !e.is_manager).map((e) => (
              <tr key={e.id}><td><b>{e.name}</b></td>
                {L.days.map((_, i) => {
                  const d = new Date(week); d.setDate(d.getDate() + i)
                  const day = d.toISOString().slice(0, 10)
                  const items = rows.filter((r) => r.employee_id === e.id && r.date === day)
                  return <td key={i}>{items.map((r) => displayText(r.shift, lang) + (r.status === 'draft' ? ` (${L.unpublished})` : '')).join('、')}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
