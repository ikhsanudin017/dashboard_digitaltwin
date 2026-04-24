const ADMIN_SESSION_STORAGE_KEY = 'twinspace_admin_session_expires_at'

const parseTimestamp = value => {
  const timestamp = Date.parse(String(value || ''))
  return Number.isFinite(timestamp) ? timestamp : NaN
}

export const clearAdminSession = () => {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY)
}

export const setAdminSession = expiresAt => {
  if (typeof window === 'undefined') return null

  const timestamp = parseTimestamp(expiresAt)
  if (!Number.isFinite(timestamp)) {
    clearAdminSession()
    return null
  }

  const isoString = new Date(timestamp).toISOString()
  window.sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, isoString)
  return isoString
}

export const getAdminSessionExpiresAt = () => {
  if (typeof window === 'undefined') return null

  const rawValue = window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY)
  const timestamp = parseTimestamp(rawValue)
  if (!Number.isFinite(timestamp)) {
    clearAdminSession()
    return null
  }

  return new Date(timestamp).toISOString()
}

export const getAdminSessionRemainingMs = () => {
  const expiresAt = getAdminSessionExpiresAt()
  if (!expiresAt) return 0

  const remaining = Date.parse(expiresAt) - Date.now()
  if (remaining <= 0) {
    clearAdminSession()
    return 0
  }

  return remaining
}

export const isAdminSessionActive = () => getAdminSessionRemainingMs() > 0
