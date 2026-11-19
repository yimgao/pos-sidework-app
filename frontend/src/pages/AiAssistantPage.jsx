// AI Assistant: one nav entry, two tabs — schedule Suggestions and the
// AI Draft page rendered inline. No new route; both pages keep their own
// approval gates (nothing applies until the manager clicks Adopt/Approve).
import { useState } from 'react'
import SuggestPage from './SuggestPage'
import DraftPage from './DraftPage'
import { dict } from '../i18n'

export default function AiAssistantPage({ lang }) {
  const L = dict(lang).ai
  const [sub, setSub] = useState('suggest')
  return (
    <div>
      <div className="page-head">
        <h2>{L.title}</h2>
      </div>
      <div className="ai-tabs">
        <button className={sub === 'suggest' ? 'active' : ''} onClick={() => setSub('suggest')}>{L.suggestions}</button>
        <button className={sub === 'draft' ? 'active' : ''} onClick={() => setSub('draft')}>{L.draft}</button>
      </div>
      {sub === 'suggest' ? <SuggestPage lang={lang} /> : <DraftPage lang={lang} />}
    </div>
  )
}
