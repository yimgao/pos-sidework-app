import { useEffect, useState } from 'react'
import { allScores, myScore, rollingAll, rollingMe } from '../api'
import { dict } from '../i18n'

export default function ScorePage({ user, lang }) {
  const L = dict(lang).score
  const loading = dict(lang).loading
  const [data, setData] = useState(null)
  const [rolling, setRolling] = useState(null)
  useEffect(() => {
    (user.is_manager ? allScores() : myScore()).then(setData).catch(() => {})
    ;(user.is_manager ? rollingAll() : rollingMe()).then(setRolling).catch(() => {})
  }, [user])
  if (!data) return <div className="card">{loading}</div>
  if (!user.is_manager) {
    return (
      <div className="card">
        <h2>{L.myTitle}：{user.name}</h2>
        <p>{L.todayScore}：<b>{data.score}</b> ({L.completion} {data.completion}% ×40% + {L.approval} {data.quality}% ×40% + {L.ontime} {data.ontime}% ×20%)</p>
        <p>{L.completed} {data.done} / {data.total} {L.items} · {L.reviewed} {data.reviewed} {L.items} · {L.passed} {data.passed} {L.items} · {L.late} {data.late} {L.items}</p>
        {rolling && <p>{L.rollingTitle}：<b>{rolling.no_record ? L.noRecord : rolling.rolling_score}</b>{!rolling.no_record && ` (${rolling.days_with_records} ${L.daysWithRecords})`}</p>}
        <p className="muted">{L.rollingNote}</p>
      </div>
    )
  }
  const rollById = {}
  if (Array.isArray(rolling)) rolling.forEach((r) => { rollById[r.employee_id] = r })
  return (
    <div className="card">
      <h2>{L.allTitle}</h2>
      <table><thead><tr><th>{L.employee}</th><th>{L.todayScore}</th><th>{L.rollingTitle}</th><th>{L.completed}</th><th>{L.passed}</th><th>{L.late}</th></tr></thead>
        <tbody>{data.map((s) => <tr key={s.employee_id}><td>{s.name}</td><td>{s.score}</td><td>{rollById[s.employee_id]?.no_record ? L.noRecord : (rollById[s.employee_id]?.rolling_score ?? '—')}</td><td>{s.done}/{s.total}</td><td>{s.passed}/{s.reviewed}</td><td>{s.late}</td></tr>)}</tbody>
      </table>
    </div>
  )
}
