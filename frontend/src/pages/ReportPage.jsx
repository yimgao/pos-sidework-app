import { useEffect, useState } from 'react'
import { dailyReport, generateReport } from '../api'
import { dict } from '../i18n'

export default function ReportPage({ lang }) {
  const L = dict(lang).report
  const [text, setText] = useState('')
  useEffect(() => { dailyReport(lang).then((d) => setText(d.summary_text)).catch(() => {}) }, [lang])
  return (
    <div className="card">
      <h2>{L.title}</h2>
      <p className="muted">{L.note}</p>
      <button className="btn" onClick={async () => { const d = await generateReport(lang); setText(d.summary_text) }}>{L.regenerate}</button>
      <pre>{text}</pre>
    </div>
  )
}
