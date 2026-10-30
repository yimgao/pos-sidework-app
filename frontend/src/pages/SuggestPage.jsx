import { useEffect, useState } from 'react'
import { scheduleSuggestion, todayStr } from '../api'

export default function SuggestPage() {
  const [rows, setRows] = useState([])
  useEffect(() => { scheduleSuggestion(todayStr()).then(setRows).catch(() => {}) }, [])
  return (
    <div className="card">
      <h2>下周排班建议（只读建议，不直接改排班表）</h2>
      <p className="muted">排班模块读一次 Sidework 分数后给出建议，经理确认后才生效。减半天 = 少一个班次；减一天 = 当天全部班次都不排。</p>
      <table><thead><tr><th>员工</th><th>当日分</th><th>建议</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.employee_id}><td>{r.name}</td><td>{r.score}</td><td>{r.label}</td></tr>)}</tbody>
      </table>
    </div>
  )
}
