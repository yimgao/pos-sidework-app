// Team & Roles: member table with avatar + role pills + status, working
// name search. Add-account form, roles management and owner settings kept.
import { useEffect, useState } from 'react'
import { createAccount, createRole, deleteAccount, deleteRole, getSettings, listAccounts, listRoles, setSetting, updateAccount } from '../api'
import { dict } from '../i18n'
import { initials, roleAvatarColor, roleLabel, roleStyle } from '../roles'

export default function AccountsPage({ user, lang }) {
  const L = dict(lang).accounts
  const [accounts, setAccounts] = useState([])
  const [roles, setRoles] = useState([])
  const [msg, setMsg] = useState('')
  const [query, setQuery] = useState('')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('server')
  const [isManager, setIsManager] = useState(false)
  const [roleName, setRoleName] = useState('')
  const [mgrSee, setMgrSee] = useState(true)
  const load = () => { listAccounts().then(setAccounts).catch((e) => setMsg(e.message)); listRoles().then(setRoles).catch(() => {}) }
  useEffect(() => { load(); if (user.is_owner) getSettings().then((s) => setMgrSee(s.manager_can_see_person_reports === 'true')).catch(() => {}) }, [])
  const shown = accounts.filter((a) => {
    const q = query.trim().toLowerCase()
    return !q || a.name.toLowerCase().includes(q) || (a.username || '').toLowerCase().includes(q)
  })
  return (
    <div>
      <div className="page-head">
        <h2>{L.title}</h2>
        <p className="muted">{L.subtitle} · {accounts.length} {lang === 'zh' ? '人' : 'members'}</p>
        {msg && <p className="muted error">{msg}</p>}
      </div>
      <div className="card">
        <input className="team-search" type="search" aria-label={dict(lang).responsive.searchTeam} placeholder={L.searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="table-scroll">
        <table className="responsive-table" role="table">
          <thead><tr><th>{L.member}</th><th>{L.staffRoles}</th><th>{L.status}</th><th>{L.appRole}</th><th>{dict(lang).responsive.actions}</th></tr></thead>
          <tbody>
            {shown.map((a) => (
              <tr key={a.id} className={a.is_active ? '' : 'row-inactive'}>
                <td>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div className="avatar" style={{ background: roleAvatarColor(a.role), color: '#fff' }}>{initials(a.name)}</div>
                    <div><b>{a.name}</b><div className="muted" style={{ fontSize: 13 }}>{a.username}</div></div>
                  </div>
                </td>
                <td data-label={L.staffRoles}><span className="pill" style={roleStyle(a.role)}>{roleLabel(a.role)}</span></td>
                <td data-label={L.status}>
                  <span style={{ color: a.is_active ? '#16A34A' : '#D97706' }}>●</span>{' '}
                  {a.is_active ? L.active : L.inactive}
                </td>
                <td data-label={L.appRole}>{a.is_owner ? dict(lang).owner : a.is_manager ? dict(lang).manager : dict(lang).staff}</td>
                <td className="row-actions" style={{ whiteSpace: 'nowrap' }}>
                  {a.is_owner || a.id === user.id ? (
                    <span className="muted" style={{ fontSize: 12 }}>{L.ownerLocked}</span>
                  ) : (
                  <button className="btn2" onClick={async () => {
                    if (a.is_active && !window.confirm(L.deactivateConfirm.replace('{name}', a.name))) return
                    await updateAccount(a.id, { is_active: !a.is_active }); load()
                  }}>{a.is_active ? L.deactivate : L.activate}</button>
                  )}
                  <button className="btn2" style={{ color: '#DC2626' }} onClick={async () => {
                    if (!window.confirm(L.deleteConfirm.replace('{name}', a.name))) return
                    try { await deleteAccount(a.id); load() } catch (e) { setMsg(e.message) }
                  }}>{L.delete}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {!shown.length && <p className="muted">—</p>}
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>{L.add}</h3>
        <input placeholder={L.name} value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder={L.username} value={username} onChange={(e) => setUsername(e.target.value)} />
        <input placeholder={L.password} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="server">Server</option>
          {roles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
        </select>
        {user.is_owner && <label><input type="checkbox" checked={isManager} onChange={(e) => setIsManager(e.target.checked)} /> {L.isManager}</label>}
        <button className="btn" onClick={async () => {
          try { await createAccount({ name, username, password, role, is_manager: isManager }); setName(''); setUsername(''); setPassword(''); setIsManager(false); load() } catch (e) { setMsg(e.message) }
        }}>{L.add}</button>
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>{L.rolesTitle}</h3>
        <input placeholder={L.roleName} value={roleName} onChange={(e) => setRoleName(e.target.value)} />
        <button className="btn" onClick={async () => { try { await createRole({ name: roleName }); setRoleName(''); load() } catch (e) { setMsg(e.message) } }}>{L.addRole}</button>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {roles.map((r) => (
            <span key={r.id} className="pill" style={roleStyle(r.name)}>
              {r.name}
              <button onClick={async () => { await deleteRole(r.id); load() }} style={{ border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer', marginLeft: 4 }}>×</button>
            </span>
          ))}
        </div>
        {user.is_owner && (<>
          <h3>{L.settingsTitle}</h3>
          <label><input type="checkbox" checked={mgrSee} onChange={(e) => setMgrSee(e.target.checked)} /> {L.mgrSeeReports}</label>
          <button className="btn" onClick={async () => { await setSetting({ key: 'manager_can_see_person_reports', value: mgrSee ? 'true' : 'false' }); setMsg(L.save) }}>{L.save}</button>
        </>)}
      </div>
    </div>
  )
}
