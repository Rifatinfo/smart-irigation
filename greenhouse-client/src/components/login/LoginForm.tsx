'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import { api, ApiError, errorMessage } from '@/lib/api'
import { googleAccessToken, loadGoogle } from '@/lib/google'
import { FormField } from './FormField'
import { GoogleButton } from './GoogleButton'

const WRONG_CREDENTIALS = 'Incorrect email or password. Check your credentials and try again.'

/** Only same-site relative paths, so ?next= can't send the user to another site. */
function nextPath() {
  const next = new URLSearchParams(window.location.search).get('next')
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'
}

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState<false | 'password' | 'google'>(false)
  const [googleClientId, setGoogleClientId] = useState<string | null>(null)

  // Already signed in (valid cookie)? Go straight to the dashboard.
  useEffect(() => {
    let cancelled = false
    api
      .me()
      .then(() => !cancelled && router.replace(nextPath()))
      .catch(() => undefined)
    // Offer Google sign-in only when the server has a Google client ID configured
    api
      .authConfig()
      .then((c) => {
        if (cancelled || !c.googleClientId) return
        setGoogleClientId(c.googleClientId)
        loadGoogle().catch(() => undefined) // preload so the popup opens straight away
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [router])

  const signInWithGoogle = async () => {
    if (!googleClientId) return
    setError('')
    setInfo('')
    setBusy('google')
    try {
      const token = await googleAccessToken(googleClientId)
      await api.loginWithGoogle(token, remember)
      router.replace(nextPath())
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setInfo('')
    if (!email.trim() || !password) {
      setError('Enter both your email and password.')
      return
    }
    setError('')
    setBusy('password')
    try {
      const res = await api.login(email.trim(), password, remember)
      router.replace(res.needPasswordChange ? '/settings' : nextPath())
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? WRONG_CREDENTIALS : errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
      <FormField icon={Mail} label={<span className="mb-1.5 block text-sm font-medium text-ink">Email</span>}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 w-full min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-faint"
          placeholder="admin@greenhouse.local"
          autoComplete="email"
          autoFocus
        />
      </FormField>

      <FormField
        icon={Lock}
        label={
          <span className="mb-1.5 flex items-center justify-between text-sm font-medium text-ink">
            Password
            <button
              type="button"
              onClick={() => setInfo('Ask the administrator to run “npm run user:reset-password” on the greenhouse server. It prints a new password.')}
              className="text-xs font-medium text-forest hover:underline"
            >
              Forgot password?
            </button>
          </span>
        }
      >
        <input
          type={show ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11 w-full min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-faint"
          placeholder="••••••••"
          autoComplete="current-password"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="text-faint transition-colors duration-150 hover:text-ink"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </FormField>

      <label className="flex cursor-pointer select-none items-center gap-2.5 pt-1 text-sm text-muted">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded accent-forest" />
        Keep me signed in on this device
      </label>

      {info && <p className="rounded-lg bg-mint px-3.5 py-2.5 text-sm text-forest">{info}</p>}

      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy !== false}
        className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-forest text-sm font-semibold text-white transition-[background-color,transform] duration-150 ease-out hover:bg-forest-hover active:scale-[0.98] disabled:opacity-80"
      >
        {busy === 'password' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
          </>
        ) : (
          'Sign in'
        )}
      </button>

      {googleClientId && (
        <>
          <div className="flex items-center gap-3 py-1 text-xs text-faint">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>

          <GoogleButton onClick={() => void signInWithGoogle()} disabled={busy !== false} busy={busy === 'google'} />
        </>
      )}
    </form>
  )
}
