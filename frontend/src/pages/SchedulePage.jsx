import { useEffect, useState } from 'react'
import { listEmployees, mondayOf, scheduleWeek } from '../api'

const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export default function SchedulePage({ user }) {
  const [rows, setRows] = useState([])
  const [employees, setEmployees] = useState([])
  const [week, setWeek] = useState(mondayOf())
  useEffect(() => { listEmployees().then(setEmployees).catch(() => {}); scheduleWeek(week).then(setRows).catch(() => {}) }, [week])
  return (
    <div className="card">
      <h2>本周排班（排班模块，独立）</h2>
      <p className="muted">周起始：{week}。经理在正式版里在这里加“选班次 / 换人 / 发布”，员工只看已发布的自己班次。</p>
      <input type="date" value={week} onChange={(e) => setWeek(e.target.value)} />
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>员工</th>{DAYS.map((d) => <th key={d}>{d}</th>)}</tr></thead>
          <tbody>
            {employees.filter((e) => !e.is_manager).map((e) => (
              <tr key={e.id}><td><b>{e.name}</b></td>
                {DAYS.map((_, i) => {
                  const d = new Date(week); d.setDate(d.getDate() + i)
                  const day = d.toISOString().slice(0, 10)
                  const items = rows.filter((r) => r.employee_id === e.id && r.date === day)
                  return <td key={i}>{items.map((r) => r.shift).join('、')}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
