/**
 * "Sign in with Google" via Google Identity Services (token flow, popup).
 * The browser gets a short-lived Google access token; the server verifies it with Google and
 * signs the user in only if the Google email belongs to an admin account.
 */

type TokenResponse = { access_token?: string; error?: string; error_description?: string }
type TokenClient = { requestAccessToken: (o?: { prompt?: string }) => void }

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (cfg: {
            client_id: string
            scope: string
            callback: (r: TokenResponse) => void
            error_callback?: (e: { type?: string; message?: string }) => void
          }) => TokenClient
        }
      }
    }
  }
}

const SCRIPT = 'https://accounts.google.com/gsi/client'
let loading: Promise<void> | null = null

/** Loads Google's script once (call early so the popup opens instantly on click). */
export function loadGoogle(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Not in a browser'))
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      loading = null
      reject(new Error('Could not load Google sign-in. Check your internet connection.'))
    }
    document.head.appendChild(s)
  })
  return loading
}

/** Opens Google's account chooser and resolves with an access token for the signed-in Google account. */
export async function googleAccessToken(clientId: string): Promise<string> {
  await loadGoogle()
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      callback: (r) =>
        r.access_token ? resolve(r.access_token) : reject(new Error(r.error_description || r.error || 'Google sign-in failed')),
      error_callback: (e) =>
        reject(new Error(e?.type === 'popup_closed' ? `Google sign-in was closed. If Google showed “origin_mismatch”, add ${window.location.origin} to Authorized JavaScript origins of the OAuth client in Google Cloud Console.` : e?.type === 'popup_failed_to_open' ? 'The Google window was blocked. Allow pop-ups for this site and try again.' : `Google sign-in failed${e?.message ? `: ${e.message}` : ''}`)),
    })
    client.requestAccessToken({ prompt: 'select_account' })
  })
}
