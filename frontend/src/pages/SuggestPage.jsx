import { useEffect, useState } from 'react'
import { scheduleSuggestion, todayStr } from '../api'
import { dict } from '../i18n'

export default function SuggestPage({ lang }) {
  const L = dict(lang).suggest
  const [rows, setRows] = useState([])
  useEffect(() => { scheduleSuggestion(todayStr(), lang).then(setRows).catch(() => {}) }, [lang])
  return (
    <div className="card">
      <h2>{L.title}</h2>
      <p className="muted">{L.note}</p>
      <table><thead><tr><th>{L.employee}</th><th>{L.score}</th><th>{L.suggestion}</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.employee_id}><td>{r.name}</td><td>{r.score}</td><td>{r.label}</td></tr>)}</tbody>
      </table>
    </div>
  )
}
