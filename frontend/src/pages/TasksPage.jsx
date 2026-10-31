import { useEffect, useState } from 'react'
import { createTemplate, deleteTemplate, listAssignments, listEmployees, listTemplates, saveAssignments, scheduledStaff, todayStr } from '../api'
import { dict, displayText } from '../i18n'

const GROUPS = ['A', 'B', 'C', 'D']

export default function TasksPage({ lang }) {
  const L = dict(lang).tasks
  const [tasks, setTasks] = useState([])
  const [staff, setStaff] = useState([])
  const [date, setDate] = useState(todayStr())
  const [empId, setEmpId] = useState('')
  const [checked, setChecked] = useState(new Set())
  const [msg, setMsg] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [titleZh, setTitleZh] = useState('')
  const [group, setGroup] = useState('A')
  const [photo, setPhoto] = useState(false)

  const loadTasks = () => listTemplates().then(setTasks).catch((e) => setMsg(e.message))
  const loadAssign = async (d, id) => {
    if (!id) return
    const all = await listAssignments(d).catch(() => [])
    setChecked(new Set(all.filter((a) => String(a.employee_id) === String(id)).map((a) => a.template_id)))
  }
  useEffect(() => { loadTasks(); scheduledStaff(date).then((s) => { setStaff(s); if (s.length && !empId) setEmpId(String(s[0].id)) }).catch(() => {}) }, [])
  useEffect(() => { if (empId) loadAssign(date, empId) }, [date, empId])

  return (
    <div className="card">
      <h2>{L.title}</h2>
      <p className="muted">{L.note}</p>
      <p className="muted">{msg}</p>
      <h3>{L.addTitle}</h3>
      <select value={group} onChange={(e) => setGroup(e.target.value)}>{GROUPS.map((g) => <option key={g} value={g}>{L.group} {g}</option>)}</select>
      <input placeholder={L.titleEn} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
      <input placeholder={L.titleZh} value={titleZh} onChange={(e) => setTitleZh(e.target.value)} />
      <label><input type="checkbox" checked={photo} onChange={(e) => setPhoto(e.target.checked)} /> {L.photoRequired}</label>
      <button className="btn" onClick={async () => {
        if (!titleEn.trim()) { setMsg(''); return }
        try { await createTemplate({ title_en: titleEn, title_zh: titleZh, group_letter: group, requires_photo: photo }); setTitleEn(''); setTitleZh(''); setPhoto(false); loadTasks() } catch (e) { setMsg(e.message) }
      }}>{L.add}</button>
      {GROUPS.map((g) => (
        <div key={g}>
          <h3>{L.group} {g}</h3>
          {tasks.filter((t) => (t.group_letter || 'A') === g).map((t) => (
            <div className="task" key={t.id}>
              <b>{displayText(t.title, lang)}</b> {t.requires_photo && <span className="tag">📷</span>}
              <button className="btn2" onClick={async () => { await deleteTemplate(t.id); loadTasks() }}>{L.delete}</button>
            </div>
          ))}
        </div>
      ))}
      <h3>{L.assignTitle}</h3>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <select value={empId} onChange={(e) => setEmpId(e.target.value)}>
        {staff.map((s) => <option key={s.id} value={s.id}>{s.name} {s.on_shift ? `(${L.onShift})` : `(${L.notOnShift})`}</option>)}
      </select>
      {GROUPS.map((g) => (
        <div key={'a' + g}>
          <h3>{L.group} {g}</h3>
          {tasks.filter((t) => (t.group_letter || 'A') === g).map((t) => (
            <label key={t.id} style={{ display: 'block' }}>
              <input type="checkbox" checked={checked.has(t.id)} onChange={(e) => {
                const next = new Set(checked)
                if (e.target.checked) next.add(t.id); else next.delete(t.id)
                setChecked(next)
              }} /> {displayText(t.title, lang)}
            </label>
          ))}
        </div>
      ))}
      <button className="btn" onClick={async () => {
        if (!empId) return
        try { const r = await saveAssignments({ employee_id: Number(empId), date, template_ids: [...checked] }); setMsg(`${L.saved} ${r.assigned} ${L.assignedCount}`) } catch (e) { setMsg(e.message) }
      }}>{L.saveAssign}</button>
      {!checked.size && <p className="muted">{L.emptyAssign}</p>}
    </div>
  )
}
