// 所有后端调用集中在这里，前端页面不直接拼 URL。
export function getToken() { return localStorage.getItem('pos-token') || '' }
export function setToken(t) { localStorage.setItem('pos-token', t) }
export function clearToken() { localStorage.removeItem('pos-token') }

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {}
  if (!form) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) headers['Authorization'] = 'Bearer ' + token
  const res = await fetch(path, {
    method,
    headers,
    body: form ? body : body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || '请求失败')
  return data
}

export const login = (pin) => api('/api/auth/login', { method: 'POST', body: { pin } })
export const me = () => api('/api/auth/me')
export const listEmployees = () => api('/api/employees')
export const listTemplates = () => api('/api/sidework/templates')
export const createTemplate = (body) => api('/api/sidework/templates', { method: 'POST', body })
export const deleteTemplate = (id) => api('/api/sidework/templates/' + id, { method: 'DELETE' })
export const scheduledStaff = (date) => api('/api/sidework/scheduled' + (date ? '?date=' + date : ''))
export const listAssignments = (date) => api('/api/sidework/assignments' + (date ? '?date=' + date : ''))
export const saveAssignments = (body) => api('/api/sidework/assignments', { method: 'POST', body })
export const myToday = () => api('/api/sidework/my/today')
export const completeTask = (form) => api('/api/sidework/complete', { method: 'POST', form })
export const pendingReview = () => api('/api/review/pending')
export const reviewRecord = (id, body) => api('/api/review/' + id, { method: 'POST', body })
export const markLate = (id) => api('/api/review/' + id + '/late', { method: 'POST' })
export const myScore = () => api('/api/scores/me')
export const allScores = () => api('/api/scores/all')
export const dailyReport = (lang) => api('/api/reports/daily' + (lang ? '?lang=' + lang : ''))
export const generateReport = (lang) => api('/api/reports/daily/generate' + (lang ? '?lang=' + lang : ''), { method: 'POST' })
export const scheduleSuggestion = (day, lang) => api('/api/schedule/suggestion?day=' + day + (lang ? '&lang=' + lang : ''))
export const applySuggestion = (body) => api('/api/schedule/suggestion/apply', { method: 'POST', body })
export const scheduleWeek = (weekStart) => api('/api/schedule?week_start=' + weekStart)
export const shiftTemplates = () => api('/api/schedule/templates')
export const createShiftTemplate = (body) => api('/api/schedule/templates', { method: 'POST', body })
export const createSchedule = (body) => api('/api/schedule', { method: 'POST', body })
export const updateSchedule = (id, body) => api('/api/schedule/' + id, { method: 'PATCH', body })
export const deleteSchedule = (id) => api('/api/schedule/' + id, { method: 'DELETE' })
export const publishSchedule = (weekStart) => api('/api/schedule/publish?week_start=' + weekStart, { method: 'POST' })
export const rollingMe = (day) => api('/api/scores/rolling/me' + (day ? '?day=' + day : ''))
export const rollingAll = (day) => api('/api/scores/rolling/all' + (day ? '?day=' + day : ''))
export const createDraft = (body) => api('/api/ai/drafts', { method: 'POST', body })
export const listDrafts = () => api('/api/ai/drafts')
export const approveDraft = (id) => api('/api/ai/drafts/' + id + '/approve', { method: 'POST' })
export const rejectDraft = (id) => api('/api/ai/drafts/' + id + '/reject', { method: 'POST' })
export const removeDraftEntry = (id, index) => api('/api/ai/drafts/' + id + '/remove-entry', { method: 'POST', body: { index } })
export const screenPhoto = (id, lang) => api('/api/ai/screen/' + id + (lang ? '?lang=' + lang : ''), { method: 'POST' })
export const emailReport = (lang) => api('/api/ai/report-email' + (lang ? '?lang=' + lang : ''), { method: 'POST' })

export function mondayOf(d = new Date()) {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - day)
  return x.toISOString().slice(0, 10)
}
export function todayStr() { return new Date().toISOString().slice(0, 10) }
