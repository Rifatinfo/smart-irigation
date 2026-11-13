/** The signed-in user shown in the sidebar account menu. */
export const CURRENT_USER = {
  name: 'Amara Reyes',
  role: 'Admin',
  email: 'amara@verdant.farm',
  /** Profile photo in /public, e.g. '/icons/avatar.png'. Leave null to show initials. */
  avatar: null as string | null,
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
