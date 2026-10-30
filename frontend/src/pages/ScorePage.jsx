import { useEffect, useState } from 'react'
import { allScores, myScore } from '../api'

export default function ScorePage({ user }) {
  const [data, setData] = useState(null)
  useEffect(() => { (user.is_manager ? allScores() : myScore()).then(setData).catch(() => {}) }, [user])
  if (!data) return <div className="card">Loading… 加载中…</div>
  if (!user.is_manager) {
    return (
      <div className="card">
        <h2>My Score 我的分数：{user.name}</h2>
        <p>Today's score 当日分：<b>{data.score}</b> (Completion 完成率 {data.completion}% ×40% + Approval rate 复核通过率 {data.quality}% ×40% + On-time rate 准时率 {data.ontime}% ×20%)</p>
        <p>Completed 完成 {data.done} / {data.total} items 项 · Reviewed 已复核 {data.reviewed} items 项 · Passed 通过 {data.passed} items 项 · Late 迟交 {data.late} items 项</p>
        <p className="muted">Full version uses a 14-day rolling average 正式版按最近 14 天平均算滚动分，two consecutive weeks below 70 trigger a reduction suggestion 连续两周低于 70 才建议减班。</p>
      </div>
    )
  }
  return (
    <div className="card">
      <h2>All Scores 全员分数 (Manager only 经理可见)</h2>
      <table><thead><tr><th>Employee 员工</th><th>Today's Score 当日分</th><th>Completed 完成</th><th>Approved 复核通过</th><th>Late 迟交</th></tr></thead>
        <tbody>{data.map((s) => <tr key={s.employee_id}><td>{s.name}</td><td>{s.score}</td><td>{s.done}/{s.total}</td><td>{s.passed}/{s.reviewed}</td><td>{s.late}</td></tr>)}</tbody>
      </table>
    </div>
  )
}
