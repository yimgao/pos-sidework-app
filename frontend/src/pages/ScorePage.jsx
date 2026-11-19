// Analytics: same score data and meaning as before, BrewLab styling —
// stat cards + progress bars for the employee, a table with avatars and
// score bars for the manager.
import { useEffect, useState } from 'react'
import { allScores, myScore, rollingAll, rollingMe } from '../api'
import { dict } from '../i18n'
import { initials, roleAvatarColor } from '../roles'

function Bar({ value, color }) {
  return <div className="progress" style={{ margin: '6px 0' }}><i style={{ width: Math.max(0, Math.min(100, value || 0)) + '%', background: color || '#4F46E5' }} /></div>
}

export default function ScorePage({ user, lang }) {
  const L = dict(lang).score
  const loading = dict(lang).loading
  const [data, setData] = useState(null)
  const [rolling, setRolling] = useState(null)
  useEffect(() => {
    (user.is_manager ? allScores() : myScore()).then(setData).catch(() => {})
    ;(user.is_manager ? rollingAll() : rollingMe()).then(setRolling).catch(() => {})
  }, [user])
  if (!data) return <div className="card">{loading}</div>
  if (!user.is_manager) {
    return (
      <div>
        <div className="page-head"><h2>{L.myTitle}：{user.name}</h2></div>
        <div className="card">
          {data.not_assigned ? <p>{L.todayScore}：<b>{lang === 'zh' ? '今日未分配，不计分' : 'Not assigned today, not scored'}</b></p> :
          <>
            <div className="stat-value" style={{ fontSize: 44 }}>{data.score}</div>
            <div className="muted">{L.todayScore}</div>
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{L.completion}</span><b>{data.completion}%</b></div>
              <Bar value={data.completion} color="#4F46E5" />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{L.approval}</span><b>{data.quality}%</b></div>
              <Bar value={data.quality} color="#16A34A" />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{L.ontime}</span><b>{data.ontime}%</b></div>
              <Bar value={data.ontime} color="#D97706" />
            </div>
          </>}
          <p>{L.completed} {data.done} / {data.total} {L.items} · {L.reviewed} {data.reviewed} {L.items} · {L.passed} {data.passed} {L.items} · {L.late} {data.late} {L.items}</p>
          {rolling && <p>{L.rollingTitle}：<b>{rolling.no_record ? L.noRecord : rolling.rolling_score}</b>{!rolling.no_record && ` (${rolling.days_with_records} ${L.daysWithRecords})`}</p>}
          <p className="muted">{L.rollingNote}</p>
        </div>
      </div>
    )
  }
  const rollById = {}
  if (Array.isArray(rolling)) rolling.forEach((r) => { rollById[r.employee_id] = r })
  return (
    <div>
      <div className="page-head"><h2>{L.analyticsTitle}</h2><p className="muted">{L.allTitle}</p></div>
      <div className="card">
        <table><thead><tr><th>{L.employee}</th><th>{L.todayScore}</th><th>{L.rollingTitle}</th><th>{L.completed}</th><th>{L.passed}</th><th>{L.late}</th></tr></thead>
          <tbody>{data.map((s) => (
            <tr key={s.employee_id}>
              <td>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div className="avatar" style={{ background: roleAvatarColor('server'), color: '#fff' }}>{initials(s.name)}</div>
                  <b>{s.name}</b>
                </div>
              </td>
              <td>
                {s.not_assigned ? (lang === 'zh' ? '未分配' : 'Not assigned') : (<><b>{s.score}</b><Bar value={s.score} color={s.score < 70 ? '#DC2626' : '#16A34A'} /></>)}
              </td>
              <td>{rollById[s.employee_id]?.no_record ? L.noRecord : (rollById[s.employee_id]?.rolling_score ?? '—')}</td>
              <td>{s.done}/{s.total}</td><td>{s.passed}/{s.reviewed}</td><td>{s.late}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
