// Shared role -> color map (BrewLab-style pills). Single source of truth:
// every role pill, schedule chip and avatar color in the app comes from
// here, so a role always looks the same on every page.
export function roleKey(role) {
  const k = String(role || 'all').trim().toLowerCase()
  if (k === 'bus') return 'busser'
  return k
}

const MAP = {
  server: { bg: '#EEF2FF', fg: '#4F46E5', avatar: '#4F46E5' },
  busser: { bg: '#FEF3C7', fg: '#B45309', avatar: '#F59E0B' },
  bar: { bg: '#FEF3C7', fg: '#B45309', avatar: '#F59E0B' },
  host: { bg: '#CFFAFE', fg: '#0E7490', avatar: '#06B6D4' },
  manager: { bg: '#EDE9FE', fg: '#6D28D9', avatar: '#7C3AED' },
  owner: { bg: '#EDE9FE', fg: '#6D28D9', avatar: '#7C3AED' },
  cook: { bg: '#FDE2E2', fg: '#B91C1C', avatar: '#EF4444' },
  cashier: { bg: '#D1FAE5', fg: '#047857', avatar: '#10B981' },
  'shift lead': { bg: '#EDE9FE', fg: '#6D28D9', avatar: '#8B5CF6' },
  dishwasher: { bg: '#F3F4F6', fg: '#4B5563', avatar: '#6B7280' },
  all: { bg: '#EEF2FF', fg: '#4F46E5', avatar: '#4F46E5' },
}
const FALLBACK = { bg: '#F3F4F6', fg: '#4B5563', avatar: '#6B7280' }

// Pill / chip inline style for a role: { background, color }.
export function roleStyle(role) {
  const m = MAP[roleKey(role)] || FALLBACK
  return { background: m.bg, color: m.fg }
}

// Avatar circle background for a role.
export function roleAvatarColor(role) {
  return (MAP[roleKey(role)] || FALLBACK).avatar
}

// Display label for a role value as stored ('server', 'Server', 'all', …).
export function roleLabel(role, allLabel = 'All roles') {
  if (roleKey(role) === 'all') return allLabel
  const s = String(role || '').trim()
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : allLabel
}

export function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/)
  return (parts[0]?.[0] || '?').toUpperCase() + (parts[1]?.[0] || '').toUpperCase()
}
