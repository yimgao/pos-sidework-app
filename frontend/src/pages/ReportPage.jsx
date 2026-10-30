import { useEffect, useState } from 'react'
import { dailyReport, generateReport } from '../api'

export default function ReportPage() {
  const [text, setText] = useState('')
  useEffect(() => { dailyReport().then((d) => setText(d.summary_text)).catch(() => {}) }, [])
  return (
    <div className="card">
      <h2>每日 AI 总结报告（经理可见）</h2>
      <p className="muted">规则版先生成文字；视觉判照片是第二步，只标存疑、不直接判不合格。</p>
      <button className="btn" onClick={async () => { const d = await generateReport(); setText(d.summary_text) }}>重新生成今日报告</button>
      <pre>{text}</pre>
    </div>
  )
}
