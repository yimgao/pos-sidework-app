import { useEffect, useState } from 'react'
import { completeTask, myToday } from '../api'

export default function TodayPage({ user }) {
  const [data, setData] = useState(null)
  const [files, setFiles] = useState({})
  const [notes, setNotes] = useState({})
  const [msg, setMsg] = useState('')
  const load = () => myToday().then(setData).catch((e) => setMsg(e.message))
  useEffect(() => { load() }, [])
  if (user.is_manager) return <div className="card"><h2>今日 Sidework</h2><p className="muted">经理请去“经理复核”页。员工登录后在这里做自己当天的清单。</p></div>
  if (!data) return <div className="card">加载中…</div>
  let cur = ''
  return (
    <div className="card">
      <h2>今日 Sidework：{user.name} · {data.date}</h2>
      <p className="muted">必传项必须传照片或视频才能点完成。{msg}</p>
      {data.items.map((it) => {
        const head = it.category !== cur ? (cur = it.category, <h3 key={'h' + it.category}>{it.category}</h3>) : null
        const status = it.status === 'done' && it.review === 'pass' ? <span className="tag ok">复核通过</span>
          : it.status === 'done' && it.review === 'fail' ? <span className="tag bad">打回：{it.review_note}</span>
          : it.status === 'done' ? <span className="tag warn">待复核</span> : <span className="tag">待做</span>
        return (
          <div key={it.template_id}>
            {head}
            <div className="task">
              <b>{it.title}</b> {it.requires_photo && <span className="tag">必传照片/视频</span>} {status}
              <div><input type="file" accept="image/*,video/*" onChange={(e) => setFiles({ ...files, [it.template_id]: e.target.files[0] })} /></div>
              {it.photo_url && <img className="thumb" src={it.photo_url} alt="" />}
              {it.file_name && <p className="muted">已传文件：{it.file_name}</p>}
              <input placeholder="备注（可选）" value={notes[it.template_id] ?? it.note} onChange={(e) => setNotes({ ...notes, [it.template_id]: e.target.value })} />
              <button className="btn" onClick={async () => {
                const form = new FormData()
                form.append('template_id', it.template_id)
                form.append('note', notes[it.template_id] ?? it.note ?? '')
                if (files[it.template_id]) form.append('file', files[it.template_id])
                try { await completeTask(form); setMsg('已提交，等待经理复核。'); load() } catch (e) { setMsg(e.message) }
              }}>标记完成</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
