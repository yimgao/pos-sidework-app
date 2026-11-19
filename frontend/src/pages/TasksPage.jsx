// Checklist Templates: templates grouped by role (tabs across the top),
// add-task form as a modal. Daily assignment kept, filtered by the same
// role tab. Deleting a task still only deactivates it (history kept).
import { useEffect, useState } from 'react'
import { createTemplate, deleteTemplate, listAssignments, listEmployees, listRoles, listTemplates, saveAssignments, scheduledStaff, todayStr } from '../api'
import { dict, displayText } from '../i18n'
import { roleLabel, roleStyle } from '../roles'

const GROUPS = ['A', 'B', 'C', 'D', 'E']

function matchesRole(t, tab) {
  if (tab === 'all') return true
  const r = (t.role || 'all').toLowerCase()
  return r === 'all' || r === tab.toLowerCase()
}

export default function TasksPage({ lang }) {
  const L = dict(lang).tasks
  const [tasks, setTasks] = useState([])
  const [staff, setStaff] = useState([])
  const [date, setDate] = useState(todayStr())
  const [empId, setEmpId] = useState('')
  const [checked, setChecked] = useState(new Set())
  const [msg, setMsg] = useState('')
  const [roleTab, setRoleTab] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [titleEn, setTitleEn] = useState('')
  const [titleZh, setTitleZh] = useState('')
  const [group, setGroup] = useState('A')
  const [photo, setPhoto] = useState(false)
  const [standard, setStandard] = useState('')
  const [segment, setSegment] = useState('opening')
  const [role, setRole] = useState('all')
  const [optional, setOptional] = useState(false)
  const [roles, setRoles] = useState([])

  const loadTasks = () => listTemplates().then(setTasks).catch((e) => setMsg(e.message))
  const loadAssign = async (d, id) => {
    if (!id) return
    const all = await listAssignments(d).catch(() => [])
    setChecked(new Set(all.filter((a) => String(a.employee_id) === String(id)).map((a) => a.template_id)))
  }
  useEffect(() => { loadTasks(); listRoles().then(setRoles).catch(() => {}); scheduledStaff(date).then((s) => { setStaff(s); if (s.length && !empId) setEmpId(String(s[0].id)) }).catch(() => {}) }, [])
  useEffect(() => { if (empId) loadAssign(date, empId) }, [date, empId])

  const visible = tasks
    .filter((t) => matchesRole(t, roleTab))
    .sort((a, b) => (a.group_letter || 'A').localeCompare(b.group_letter || 'A') || (a.sort_order - b.sort_order))

  const submitAdd = async () => {
    if (!titleEn.trim()) return
    try {
      await createTemplate({ title_en: titleEn, title_zh: titleZh, group_letter: group, requires_photo: photo, standard, segment, role, optional })
      setTitleEn(''); setTitleZh(''); setPhoto(false); setStandard(''); setShowModal(false); loadTasks()
    } catch (e) { setMsg(e.message) }
  }

  return (
    <div>
      <div className="page-head">
        <h2>{L.title}</h2>
        <p className="muted">{L.subtitle}</p>
        <p className="muted">{L.note}</p>
        {msg && <p className="muted error">{msg}</p>}
      </div>
      <div className="role-tabs">
        <button className={roleTab === 'all' ? 'active' : ''} onClick={() => setRoleTab('all')}>{L.allRoles} ({tasks.length})</button>
        {roles.map((r) => (
          <button key={r.id} className={roleTab === r.name ? 'active' : ''} onClick={() => setRoleTab(r.name)}>
            {r.name} ({tasks.filter((t) => matchesRole(t, r.name)).length})
          </button>
        ))}
      </div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>{roleTab === 'all' ? L.allRoles : roleTab} ({visible.length})</h3>
          <button className="btn" onClick={() => setShowModal(true)}>+ {L.newTask}</button>
        </div>
        {visible.map((t) => (
          <div className="tpl-row" key={t.id}>
            <span className="drag-handle" title="Drag to reorder (coming soon)">⋮⋮</span>
            <span className="tpl-order">{t.sort_order}</span>
            <div className="tpl-body">
              <b>{displayText(t.title, lang)}</b>{' '}
              <span className="pill" style={roleStyle(t.role)}>{roleLabel(t.role, L.allRoles)}</span>{' '}
              {t.requires_photo && <span className="tag">📷</span>}{' '}
              {t.segment && <span className="tag">{t.segment}</span>}{' '}
              {t.optional && <span className="tag">{L.optional}</span>}
              {t.standard && <p className="standard">{t.standard}</p>}
            </div>
            <button className="btn2" onClick={async () => { await deleteTemplate(t.id); loadTasks() }}>{L.delete}</button>
          </div>
        ))}
        {!visible.length && <p className="muted">—</p>}
      </div>

      <div className="card">
        <h3>{L.assignTitle}</h3>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <select value={empId} onChange={(e) => setEmpId(e.target.value)}>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.name} {s.on_shift ? `(${L.onShift})` : `(${L.notOnShift})`}</option>)}
        </select>
        {visible.map((t) => (
          <label key={t.id} style={{ display: 'block', padding: '6px 0' }}>
            <input type="checkbox" checked={checked.has(t.id)} onChange={(e) => {
              const next = new Set(checked)
              if (e.target.checked) next.add(t.id); else next.delete(t.id)
              setChecked(next)
            }} /> {displayText(t.title, lang)}{' '}
            <span className="pill" style={roleStyle(t.role)}>{roleLabel(t.role, L.allRoles)}</span>
          </label>
        ))}
        <button className="btn" onClick={async () => {
          if (!empId) return
          try { const r = await saveAssignments({ employee_id: Number(empId), date, template_ids: [...checked] }); setMsg(`${L.saved} ${r.assigned} ${L.assignedCount}`) } catch (e) { setMsg(e.message) }
        }}>{L.saveAssign}</button>
        {!checked.size && <p className="muted">{L.emptyAssign}</p>}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal">
            <h3>{L.addTitle}</h3>
            <label className="field">{L.group}</label>
            <select value={group} onChange={(e) => setGroup(e.target.value)}>{GROUPS.map((g) => <option key={g} value={g}>{L.group} {g}</option>)}</select>
            <label className="field">{L.titleEn}</label>
            <input placeholder={L.titleEn} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
            <input placeholder={L.titleZh} value={titleZh} onChange={(e) => setTitleZh(e.target.value)} />
            <label className="field">{L.role}</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="all">{L.allRoles}</option>
              {roles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
            </select>
            <label className="field">{L.segment}</label>
            <select value={segment} onChange={(e) => { setSegment(e.target.value); setOptional(e.target.value === 'midday') }}>
              <option value="opening">Opening</option><option value="midday">Midday</option><option value="evening">Evening</option>
            </select>
            <label><input type="checkbox" checked={optional} onChange={(e) => setOptional(e.target.checked)} /> {L.optional}</label>
            <label className="field">{L.standard}</label>
            <input placeholder={L.standard} value={standard} onChange={(e) => setStandard(e.target.value)} />
            <label><input type="checkbox" checked={photo} onChange={(e) => setPhoto(e.target.checked)} /> {L.photoRequired}</label>
            <div className="modal-actions">
              <button className="btn2" onClick={() => setShowModal(false)}>{L.cancel}</button>
              <button className="btn" onClick={submitAdd}>{L.add}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
