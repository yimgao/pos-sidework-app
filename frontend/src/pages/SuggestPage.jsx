import { useEffect, useState } from 'react'
import { scheduleSuggestion, todayStr } from '../api'

export default function SuggestPage() {
  const [rows, setRows] = useState([])
  useEffect(() => { scheduleSuggestion(todayStr()).then(setRows).catch(() => {}) }, [])
  return (
    <div className="card">
      <h2>Next Week Schedule Suggestions 下周排班建议 (Read-only, does not change the schedule directly 只读建议，不直接改排班表)</h2>
      <p className="muted">Schedule module reads the Sidework score once, then suggests 排班模块读一次 Sidework 分数后给出建议，manager approval required 经理确认后才生效。Reduce by half day = one fewer shift 减半天 = 少一个班次；reduce by one day = no shifts that day 减一天 = 当天全部班次都不排。</p>
      <table><thead><tr><th>Employee 员工</th><th>Today's Score 当日分</th><th>Suggestion 建议</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.employee_id}><td>{r.name}</td><td>{r.score}</td><td>{r.label}</td></tr>)}</tbody>
      </table>
    </div>
  )
}
