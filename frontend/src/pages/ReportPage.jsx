import { useEffect, useState } from 'react'
import { dailyReport, generateReport } from '../api'

export default function ReportPage() {
  const [text, setText] = useState('')
  useEffect(() => { dailyReport().then((d) => setText(d.summary_text)).catch(() => {}) }, [])
  return (
    <div className="card">
      <h2>Daily AI Summary Report 每日 AI 总结报告 (Manager only 经理可见)</h2>
      <p className="muted">Rule-based version generates text first 规则版先生成文字；photo screening is step 2, flags uncertain only 视觉判照片是第二步，只标存疑、不直接判不合格。</p>
      <button className="btn" onClick={async () => { const d = await generateReport(); setText(d.summary_text) }}>Regenerate Today's Report 重新生成今日报告</button>
      <pre>{text}</pre>
    </div>
  )
}
