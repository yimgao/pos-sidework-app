import { useEffect, useState } from 'react'
import { dailyReport, emailReport, generateReport } from '../api'
import { dict } from '../i18n'

export default function ReportPage({ lang }) {
  const L = dict(lang).report
  const [text, setText] = useState('')
  const [emailMsg, setEmailMsg] = useState('')
  useEffect(() => { dailyReport(lang).then((d) => setText(d.summary_text)).catch(() => {}) }, [lang])
  return (
    <div className="card">
      <h2>{L.title}</h2>
      <p className="muted">{L.note}</p>
      <button className="btn" onClick={async () => { const d = await generateReport(lang); setText(d.summary_text) }}>{L.regenerate}</button>
      <button className="btn2" onClick={async () => { const d = await emailReport(lang); setEmailMsg(d.sent ? `${L.emailSent} → ${d.to}` : `${L.emailPreview}：${d.reason}`) }}>{L.email}</button>
      {emailMsg && <p className="muted">{emailMsg}</p>}
      <pre>{text}</pre>
    </div>
  )
}
