import { useEffect, useState } from 'react'
import { allScores, myScore } from '../api'

export default function ScorePage({ user }) {
  const [data, setData] = useState(null)
  useEffect(() => { (user.is_manager ? allScores() : myScore()).then(setData).catch(() => {}) }, [user])
  if (!data) return <div className="card">加载中…</div>
  if (!user.is_manager) {
    return (
      <div className="card">
        <h2>我的分数：{user.name}</h2>
        <p>当日分：<b>{data.score}</b>（完成率 {data.completion}% ×40% + 复核通过率 {data.quality}% ×40% + 准时率 {data.ontime}% ×20%）</p>
        <p>完成 {data.done} / {data.total} 项 · 已复核 {data.reviewed} 项 · 通过 {data.passed} 项 · 迟交 {data.late} 项</p>
        <p className="muted">正式版按最近 14 天平均算滚动分，连续两周低于 70 才建议减班。</p>
      </div>
    )
  }
  return (
    <div className="card">
      <h2>全员分数（经理可见）</h2>
      <table><thead><tr><th>员工</th><th>当日分</th><th>完成</th><th>复核通过</th><th>迟交</th></tr></thead>
        <tbody>{data.map((s) => <tr key={s.employee_id}><td>{s.name}</td><td>{s.score}</td><td>{s.done}/{s.total}</td><td>{s.passed}/{s.reviewed}</td><td>{s.late}</td></tr>)}</tbody>
      </table>
    </div>
  )
}
