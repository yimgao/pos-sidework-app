import { useEffect, useState } from 'react'
import { markLate, pendingReview, reviewRecord } from '../api'

export default function ReviewPage() {
  const [rows, setRows] = useState([])
  const [notes, setNotes] = useState({})
  const [msg, setMsg] = useState('')
  const load = () => pendingReview().then(setRows).catch((e) => setMsg(e.message))
  useEffect(() => { load() }, [])
  if (!rows.length) return <div className="card"><h2>Manager Review 经理复核</h2><p className="muted">No pending reviews 暂无待复核记录。{msg}</p></div>
  return (
    <div className="card">
      <h2>Manager Review 经理复核 (Sidework module, independent Sidework 检查模块，独立)</h2>
      <p className="muted">{msg}</p>
      {rows.map((r) => (
        <div className="task" key={r.id}>
          <b>{r.employee_name}</b> · {r.title} · {r.date} {r.late && <span className="tag warn">Late 迟交</span>}
          {r.photo_url && <img className="thumb" src={r.photo_url} alt="" />}
          {r.file_name && <p className="muted">File 文件：{r.file_name}</p>}
          <p className="muted">Note 备注：{r.note || 'None 无'}</p>
          <input placeholder="Rejection reason (required when rejecting) 打回原因（打回时必填一句话）" value={notes[r.id] || ''} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
          <div>
            <button className="btn green" onClick={async () => { await reviewRecord(r.id, { result: 'pass', note: notes[r.id] || '' }); load() }}>Approve 通过</button>
            <button className="btn red" onClick={async () => { try { await reviewRecord(r.id, { result: 'fail', note: notes[r.id] || '' }); load() } catch (e) { setMsg(e.message) } }}>Reject 打回</button>
            <button className="btn2" onClick={async () => { await markLate(r.id); load() }}>Mark Late 标迟交</button>
          </div>
        </div>
      ))}
    </div>
  )
}
