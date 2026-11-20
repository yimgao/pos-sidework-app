import { useEffect, useRef, useState } from 'react'
import { createSchedule, createShiftTemplate, deleteSchedule, listEmployees, publishSchedule, scheduleWeek, shiftTemplates, updateSchedule } from '../api'
import { dict, displayText } from '../i18n'
import { roleStyle } from '../roles'
import './schedule.css'

// Calendar dates are local civil dates, never UTC timestamps (including DST weeks).
function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function calendarDate(key) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}
function offsetDate(key, offset) {
  const date = calendarDate(key)
  date.setDate(date.getDate() + offset)
  return dateKey(date)
}
function weekOf(key) {
  return offsetDate(key, -((calendarDate(key).getDay() + 6) % 7))
}

export default function SchedulePage({ user, lang }) {
  const T = dict(lang)
  const L = T.schedule
  const R = T.responsive
  const today = dateKey(new Date())
  const [rows, setRows] = useState([])
  const [employees, setEmployees] = useState([])
  const [templates, setTemplates] = useState([])
  const [week, setWeek] = useState(() => weekOf(today))
  const [selectedDate, setSelectedDate] = useState(today)
  const [phone, setPhone] = useState(() => window.matchMedia('(max-width: 767px)').matches)
  const [preferredView, setPreferredView] = useState('week')
  const view = phone ? 'day' : preferredView
  const [newEmp, setNewEmp] = useState('')
  const [newShift, setNewShift] = useState('')
  const [newDate, setNewDate] = useState(today)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const [shiftNameEn, setShiftNameEn] = useState('')
  const [shiftNameZh, setShiftNameZh] = useState('')
  const [shiftStart, setShiftStart] = useState('14:00')
  const [shiftEnd, setShiftEnd] = useState('closing')
  const [shiftEndTime, setShiftEndTime] = useState('22:00')
  const [editCell, setEditCell] = useState(null)
  const [cellAddShift, setCellAddShift] = useState('')
  const editTrigger = useRef(null)
  const editorRef = useRef(null)
  const mutationLock = useRef(false)
  const locale = lang === 'zh' ? 'zh-CN' : 'en-US'
  const formatDate = (key, options) => calendarDate(key).toLocaleDateString(locale, options)
  const days = Array.from({ length: 7 }, (_, index) => offsetDate(week, index))
  const staff = user.is_manager ? employees.filter((employee) => !employee.is_manager) : [user]

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const resize = () => setPhone(media.matches)
    media.addEventListener('change', resize)
    return () => media.removeEventListener('change', resize)
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    // Employees do not need the team directory to read their own schedule.
    Promise.all([user.is_manager ? listEmployees() : Promise.resolve([]), shiftTemplates(), scheduleWeek(week)])
      .then(([people, shifts, schedules]) => {
        if (!active) return
        setEmployees(people)
        setTemplates(shifts)
        setRows(schedules)
        setNewEmp((value) => value || people.find((employee) => !employee.is_manager)?.id || '')
        setNewShift((value) => value || shifts[0]?.id || '')
      })
      .catch((error) => { if (active) { setRows([]); setMsg(error.message) } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [week, revision, user.id, user.is_manager])

  useEffect(() => {
    if (editCell && !loading) editorRef.current?.querySelector('select, button')?.focus()
    else if (!editCell && editTrigger.current) {
      document.getElementById(editTrigger.current)?.focus()
      editTrigger.current = null
    }
  }, [editCell, loading, view])

  const mutate = async (action, message) => {
    if (mutationLock.current) return
    mutationLock.current = true
    setBusy(true)
    setMsg('')
    try {
      const result = await action()
      if (message) setMsg(typeof message === 'function' ? message(result) : message)
      setRevision((value) => value + 1)
    } catch (error) { setMsg(error.message) }
    finally { mutationLock.current = false; setBusy(false) }
  }
  const chooseDate = (date) => {
    if (!date) return
    setWeek(weekOf(date))
    setSelectedDate(date)
    setNewDate(date)
    setEditCell(null)
  }
  const itemsFor = (employeeId, date) => rows.filter((row) => row.employee_id === employeeId && row.date === date && row.status !== 'cancelled' && (user.is_manager || row.status === 'published'))
  const options = templates.map((template) => <option key={template.id} value={template.id}>{displayText(template.name, lang)}</option>)
  const chip = (row) => <span key={row.id} className="shift-chip" style={roleStyle(templates.find((template) => template.id === row.shift_template_id)?.role)}>{displayText(row.shift, lang)}{row.status === 'draft' && <small> ({L.unpublished})</small>}</span>
  const closeEditor = () => {
    setEditCell(null)
  }
  const personCell = (employee, date) => {
    const items = itemsFor(employee.id, date)
    const editing = user.is_manager && editCell?.employeeId === employee.id && editCell.date === date
    const label = `${employee.name}, ${formatDate(date, { month: 'short', day: 'numeric' })}`
    if (editing) return (
      <div ref={editorRef} className="schedule-editor" onKeyDown={(event) => { if (event.key === 'Escape') closeEditor() }}>
        {items.map((row) => <div className="schedule-editor-row" key={row.id}>
          <select aria-label={`${R.edit}: ${label}, ${displayText(row.shift, lang)}`} value={row.shift_template_id} disabled={busy || loading} onChange={(event) => mutate(() => updateSchedule(row.id, { shift_template_id: Number(event.target.value) }))}>{options}</select>
          <button type="button" className="btn2 schedule-cancel" disabled={busy || loading} aria-label={`${R.cancelShift}: ${label}, ${displayText(row.shift, lang)}`} onClick={() => mutate(() => deleteSchedule(row.id))}>×</button>
        </div>)}
        <div className="schedule-editor-row">
          <select aria-label={`${L.add}: ${label}`} value={cellAddShift} onChange={(event) => setCellAddShift(event.target.value)}>{options}</select>
          <button type="button" className="btn2" disabled={busy || loading || !cellAddShift} aria-label={`${L.add}: ${label}`} onClick={() => mutate(() => createSchedule({ employee_id: employee.id, shift_template_id: Number(cellAddShift), date }), R.draftAdded)}>+</button>
        </div>
        <button type="button" className="btn2" onClick={closeEditor}>{L.done}</button>
      </div>
    )
    return <div className="schedule-cell-content">
      <div className="schedule-chips">{items.length ? items.map(chip) : <span className="muted">{R.noShifts}</span>}</div>
      {user.is_manager && <button type="button" id={`schedule-edit-${employee.id}-${date}`} className="schedule-edit" aria-label={`${items.length ? R.edit : L.add}: ${label}`} onClick={(event) => {
        editTrigger.current = event.currentTarget.id
        setEditCell({ employeeId: employee.id, date })
        setCellAddShift(templates[0]?.id || '')
      }}>{items.length ? R.edit : '+'}</button>}
    </div>
  }

  return <div className="schedule-workspace">
    <div className="page-head">
      <h2>{R.schedule}</h2>
      {user.is_manager && <p className="muted">{L.newDraftNote}</p>}
    </div>
    <section className="schedule-surface">
      <div className="schedule-toolbar">
        <label className="schedule-week-picker">{L.weekStarting}<input type="date" value={week} onChange={(event) => chooseDate(event.target.value)} /></label>
        <button type="button" className="btn2" onClick={() => chooseDate(today)}>{R.today}</button>
        <div className="schedule-view-switch" role="group" aria-label={R.schedule}>
          {['day', 'week'].map((mode) => <button type="button" key={mode} aria-pressed={view === mode} onClick={() => { setPreferredView(mode); setEditCell(null) }}>{R[mode]}</button>)}
        </div>
        {user.is_manager && <button type="button" className="btn schedule-publish" disabled={busy || loading} onClick={() => mutate(() => publishSchedule(week), (result) => R.weekPublished.replace('{count}', result.published))}>{L.publish}</button>}
      </div>
      {user.is_manager && <div className="schedule-management">
        <form className="schedule-add-form" aria-label={L.addTitle} onSubmit={(event) => {
          event.preventDefault()
          mutate(() => createSchedule({ employee_id: Number(newEmp), shift_template_id: Number(newShift), date: newDate }), R.draftAdded)
        }}>
          <label>{L.employee}<select required value={newEmp} onChange={(event) => setNewEmp(event.target.value)}>{staff.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
          <label>{R.shift}<select required value={newShift} onChange={(event) => setNewShift(event.target.value)}>{options}</select></label>
          <label>{R.date}<input required type="date" value={newDate} onChange={(event) => setNewDate(event.target.value)} /></label>
          <button className="btn2" disabled={busy || loading || !newEmp || !newShift}>{L.add}</button>
        </form>
        <details className="schedule-custom">
          <summary>{L.customTitle}</summary>
          <form className="schedule-custom-form" onSubmit={(event) => {
            event.preventDefault()
            mutate(async () => {
              await createShiftTemplate({ name_en: shiftNameEn.trim() || R.customShiftName, name_zh: shiftNameZh, start_time: shiftStart, end_time: shiftEnd === 'closing' ? 'closing' : shiftEndTime })
              setShiftNameEn(''); setShiftNameZh('')
            }, R.customShiftAdded)
          }}>
            <label>{L.customNameEn}<input value={shiftNameEn} onChange={(event) => setShiftNameEn(event.target.value)} /></label>
            <label>{L.customNameZh}<input value={shiftNameZh} onChange={(event) => setShiftNameZh(event.target.value)} /></label>
            <label>{L.startTime}<input required type="time" value={shiftStart} onChange={(event) => setShiftStart(event.target.value)} /></label>
            <label>{L.endTime}<select value={shiftEnd} onChange={(event) => setShiftEnd(event.target.value)}><option value="closing">{L.toClosing}</option><option value="time">{L.endTime}</option></select></label>
            {shiftEnd === 'time' && <label>{L.endTime}<input required type="time" value={shiftEndTime} onChange={(event) => setShiftEndTime(event.target.value)} /></label>}
            <button className="btn2" disabled={busy}>{L.addShift}</button>
          </form>
          <div className="schedule-quick"><span className="muted">{L.quick}</span>{['14:00', '15:00', '16:00'].map((start) => <button type="button" className="btn2" key={start} disabled={busy} onClick={() => mutate(() => createShiftTemplate({ name_en: `${start}–Closing`, name_zh: `${start}到关门`, start_time: start, end_time: 'closing' }), R.customShiftAdded)}>{start} · {L.toClosing}</button>)}</div>
        </details>
      </div>}
      <div className="schedule-message" role="status" aria-live="polite">{msg || (loading ? T.loading : '')}</div>
      {view === 'day' ? <div className="schedule-day-view" aria-busy={loading}>
        <div className="schedule-date-strip" role="group" aria-label={R.date}>
          {days.map((date) => <button type="button" key={date} aria-pressed={selectedDate === date} aria-current={date === today ? 'date' : undefined} aria-label={formatDate(date, { weekday: 'long', month: 'long', day: 'numeric' })} onClick={() => chooseDate(date)}><span>{formatDate(date, { weekday: 'short' })}</span><strong>{calendarDate(date).getDate()}</strong></button>)}
        </div>
        <h3 className="schedule-date-heading">{formatDate(selectedDate, { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
        {!loading && staff.map((employee) => <article className="schedule-person" key={employee.id}><h4>{employee.name}</h4>{personCell(employee, selectedDate)}</article>)}
        {!loading && !staff.length && <p className="schedule-empty muted">{R.noShifts}</p>}
      </div> : <div className="schedule-week-view" tabIndex={0} role="region" aria-label={R.week} aria-busy={loading}>
        <table className="schedule-week-table">
          <thead><tr><th scope="col">{L.employee}</th>{days.map((date) => <th scope="col" key={date} aria-current={date === today ? 'date' : undefined}><span>{formatDate(date, { weekday: 'short' })}</span><strong>{formatDate(date, { month: 'short', day: 'numeric' })}</strong></th>)}</tr></thead>
          <tbody>{!loading && staff.map((employee) => <tr key={employee.id}><th scope="row">{employee.name}</th>{days.map((date) => <td key={date}>{personCell(employee, date)}</td>)}</tr>)}</tbody>
        </table>
        {!loading && !staff.length && <p className="schedule-empty muted">{R.noShifts}</p>}
      </div>}
    </section>
  </div>
}