import { useEffect, useState } from 'react'
import { dailyReport, emailReport, generateReport } from '../api'
import { dict } from '../i18n'

export default function ReportPage({ lang }) {
  const L = dict(lang).report
  const [text, setText] = useState('')
  const [people, setPeople] = useState([])
  const [emailMsg, setEmailMsg] = useState('')
  useEffect(() => { dailyReport(lang).then((d) => { setText(d.summary_text); setPeople(d.employees || []) }).catch(() => {}) }, [lang])
  const zh = lang === 'zh'
  return (
    <div className="card">
      <h2>{L.title}</h2>
      <p className="muted">{L.note}</p>
      <button className="btn" onClick={async () => { const d = await generateReport(lang); setText(d.summary_text); setPeople(d.employees || []) }}>{L.regenerate}</button>
      <button className="btn2" onClick={async () => { const d = await emailReport(lang); setEmailMsg(d.sent ? `${L.emailSent} → ${d.to}` : `${L.emailPreview}：${d.reason}`) }}>{L.email}</button>
      {emailMsg && <p className="muted">{emailMsg}</p>}
      {people.length > 0 ? people.map((p) => (
        <div key={p.employee_id} className="task">
          {p.not_assigned ? <><b>{p.name}</b><p>{zh ? '今日未分配，不计分' : 'Not assigned today, not scored'}</p></> : <>
            <b>{p.name}：{p.score} {zh ? '分' : 'points'}{p.provisional ? (zh ? '（暂定）' : ' (provisional)') : ''}</b>
            <p className="muted">{zh ? `完成 ${p.completion}%×40% + 复核通过 ${p.quality}%×40% + 准时 ${p.ontime}%×20%，完成 ${p.done}/${p.total} 项，复核通过 ${p.passed}/${p.reviewed} 项；${p.rolling_text}` : `Completion ${p.completion}%×40% + Approval ${p.quality}%×40% + On-time ${p.ontime}%×20%, Completed ${p.done}/${p.total} items, Approved ${p.passed}/${p.reviewed} items; ${p.rolling_text}`}</p>
          </>}
          <p>{zh ? '原因：' : 'Why: '}{(p.reasons || []).join(zh ? '；' : '; ')}</p>
          <p>{zh ? '建议：' : 'Suggestion: '}{p.label}</p>
          <p>{zh ? '给员工的话：' : 'Message to employee: '}{zh ? p.employee_message_zh : p.employee_message_en}</p>
          <p className="muted">{zh ? '对照：' : 'Reference: '}{zh ? p.employee_message_en : p.employee_message_zh}</p>
        </div>
      )) : <pre>{text}</pre>}
    </div>
  )
}
