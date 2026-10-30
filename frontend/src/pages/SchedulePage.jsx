import { useEffect, useState } from 'react'
import { createSchedule, listEmployees, mondayOf, publishSchedule, scheduleWeek, shiftTemplates } from '../api'

const DAYS = ['Mon 周一', 'Tue 周二', 'Wed 周三', 'Thu 周四', 'Fri 周五', 'Sat 周六', 'Sun 周日']

export default function SchedulePage({ user }) {
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
      <h2>Weekly Schedule 本周排班</h2>
      <p className="muted">Schedule module, independent 排班模块，独立。Week starting 周起始：{week}. New schedules are drafts first 新增后先是未发布，publish to make them visible 点“发布本周”员工才看得到。{msg}</p>
      <input type="date" value={week} onChange={(e) => setWeek(e.target.value)} />

      {user.is_manager && (
        <div className="card">
          <h3>Add Schedule 新增排班 (Manager only 仅经理)</h3>
          <select value={newEmp} onChange={(e) => setNewEmp(e.target.value)}>
            {employees.filter((e) => !e.is_manager).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select value={newShift} onChange={(e) => setNewShift(e.target.value)}>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name} {t.start_time}-{t.end_time}</option>)}
          </select>
          <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <button className="btn" onClick={async () => {
            try {
              await createSchedule({ employee_id: Number(newEmp), shift_template_id: Number(newShift), date: newDate })
              setMsg('Added as draft 已新增，未发布。'); load()
            } catch (e) { setMsg(e.message) }
          }}>Add Schedule 新增排班</button>
          <button className="btn" onClick={async () => {
            try {
              const r = await publishSchedule(week)
              setMsg('Published ' + r.published + ' shifts 已发布 ' + r.published + ' 条。'); load()
            } catch (e) { setMsg(e.message) }
          }}>Publish Week 发布本周</button>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>Employee 员工</th>{DAYS.map((d) => <th key={d}>{d}</th>)}</tr></thead>
          <tbody>
            {employees.filter((e) => !e.is_manager).map((e) => (
              <tr key={e.id}><td><b>{e.name}</b></td>
                {DAYS.map((_, i) => {
                  const d = new Date(week); d.setDate(d.getDate() + i)
                  const day = d.toISOString().slice(0, 10)
                  const items = rows.filter((r) => r.employee_id === e.id && r.date === day)
                  return <td key={i}>{items.map((r) => r.shift + (r.status === 'draft' ? ' (Unpublished 未发布)' : '')).join('、')}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
