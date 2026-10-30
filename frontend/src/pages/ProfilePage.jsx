import { dict } from '../i18n'

// User's own profile: language switch lives ONLY here.
// EN = all English, 中文 = all Chinese, choice is saved in localStorage.
export default function ProfilePage({ user, lang, onLang, onLogout, onBack }) {
  const L = dict(lang)
  const P = L.profile
  return (
    <div className="card">
      <button className="btn2" onClick={onBack}>← {P.back}</button>
      <h2 style={{ marginTop: 12 }}>{P.title}</h2>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '12px 0' }}>
        <div className="avatar" style={{ width: 48, height: 48, fontSize: 20 }}>{user.name.slice(0, 1)}</div>
        <div><b style={{ fontSize: 18 }}>{user.name}</b><p className="muted" style={{ margin: 0 }}>{user.is_manager ? L.manager : L.staff}</p></div>
      </div>
      <div className="card" style={{ margin: 0 }}>
        <h3 style={{ marginTop: 0 }}>{P.language}</h3>
        <p className="muted">{P.languageNote}</p>
        <div className="lang-switch large">
          <button className={lang === 'en' ? 'active' : ''} onClick={() => onLang('en')}>EN</button>
          <button className={lang === 'zh' ? 'active' : ''} onClick={() => onLang('zh')}>中文</button>
        </div>
      </div>
      <button className="btn red" style={{ marginTop: 16 }} onClick={onLogout}>{L.logout}</button>
    </div>
  )
}
