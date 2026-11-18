import { useEffect, useState } from 'react'
import { createAccount, createRole, deleteRole, getSettings, listAccounts, listRoles, setSetting, updateAccount } from '../api'
import { dict } from '../i18n'

export default function AccountsPage({ user, lang }) {
  const L = dict(lang).accounts
  const [accounts, setAccounts] = useState([])
  const [roles, setRoles] = useState([])
  const [msg, setMsg] = useState('')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('server')
  const [isManager, setIsManager] = useState(false)
  const [roleName, setRoleName] = useState('')
  const [mgrSee, setMgrSee] = useState(true)
  const load = () => { listAccounts().then(setAccounts).catch((e) => setMsg(e.message)); listRoles().then(setRoles).catch(() => {}) }
  useEffect(() => { load(); if (user.is_owner) getSettings().then((s) => setMgrSee(s.manager_can_see_person_reports === 'true')).catch(() => {}) }, [])
  return (
    <div className="card">
      <h2>{L.title}</h2>
      <p className="muted">{msg}</p>
      <h3>{L.add}</h3>
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
      {accounts.map((a) => (
        <div className="task" key={a.id}>
          <b>{a.name}</b> · {a.username} · {a.role} {a.is_owner ? '· Owner' : a.is_manager ? '· Manager' : ''}
          <button className="btn2" onClick={async () => { await updateAccount(a.id, { is_active: !a.is_active }); load() }}>{a.is_active ? L.deactivate : L.activate}</button>
        </div>
      ))}
      <h3>{L.rolesTitle}</h3>
      <input placeholder={L.roleName} value={roleName} onChange={(e) => setRoleName(e.target.value)} />
      <button className="btn" onClick={async () => { try { await createRole({ name: roleName }); setRoleName(''); load() } catch (e) { setMsg(e.message) } }}>{L.addRole}</button>
      {roles.map((r) => <div key={r.id}>{r.name} <button className="btn2" onClick={async () => { await deleteRole(r.id); load() }}>×</button></div>)}
      {user.is_owner && (<>
        <h3>{L.settingsTitle}</h3>
        <label><input type="checkbox" checked={mgrSee} onChange={(e) => setMgrSee(e.target.checked)} /> {L.mgrSeeReports}</label>
        <button className="btn" onClick={async () => { await setSetting({ key: 'manager_can_see_person_reports', value: mgrSee ? 'true' : 'false' }); setMsg(L.save) }}>{L.save}</button>
      </>)}
    </div>
  )
}
