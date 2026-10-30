import { useEffect, useState } from 'react'
import { allScores, myScore } from '../api'
import { dict } from '../i18n'

export default function ScorePage({ user, lang }) {
  const L = dict(lang).score
  const loading = dict(lang).loading
  const [data, setData] = useState(null)
  useEffect(() => { (user.is_manager ? allScores() : myScore()).then(setData).catch(() => {}) }, [user])
  if (!data) return <div className="card">{loading}</div>
  if (!user.is_manager) {
    return (
      <div className="card">
        <h2>{L.myTitle}：{user.name}</h2>
        <p>{L.todayScore}：<b>{data.score}</b> ({L.completion} {data.completion}% ×40% + {L.approval} {data.quality}% ×40% + {L.ontime} {data.ontime}% ×20%)</p>
        <p>{L.completed} {data.done} / {data.total} {L.items} · {L.reviewed} {data.reviewed} {L.items} · {L.passed} {data.passed} {L.items} · {L.late} {data.late} {L.items}</p>
        <p className="muted">{L.rollingNote}</p>
      </div>
    )
  }
  return (
    <div className="card">
      <h2>{L.allTitle}</h2>
      <table><thead><tr><th>{L.employee}</th><th>{L.todayScore}</th><th>{L.completed}</th><th>{L.passed}</th><th>{L.late}</th></tr></thead>
        <tbody>{data.map((s) => <tr key={s.employee_id}><td>{s.name}</td><td>{s.score}</td><td>{s.done}/{s.total}</td><td>{s.passed}/{s.reviewed}</td><td>{s.late}</td></tr>)}</tbody>
      </table>
    </div>
  )
}
