import type { User } from './api'

/** Name shown in the sidebar account menu: the account name, or the part of the email before the @. */
export function displayName(u: Pick<User, 'name' | 'email'>) {
  return u.name?.trim() || u.email?.split('@')[0] || 'Administrator'
}

export function roleLabel(role: string) {
  return role === 'ADMIN' ? 'Admin' : role.charAt(0) + role.slice(1).toLowerCase()
}

export function initials(name: string) {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
