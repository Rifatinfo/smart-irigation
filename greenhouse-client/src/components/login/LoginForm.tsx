'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import { FormField } from './FormField'
import { GoogleButton } from './GoogleButton'

const DEMO_EMAIL = 'admin@verdant.farm'
const DEMO_PASSWORD = 'greenhouse'
const WRONG_CREDENTIALS = 'Incorrect email or password. Check your credentials and try again.'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState(DEMO_EMAIL)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const signIn = () => {
    setError('')
    setBusy(true)
    setTimeout(() => {
      setBusy(false)
      router.push('/dashboard')
    }, 700)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Enter both your email and password.')
      return
    }
    if (password !== DEMO_PASSWORD) {
      setError(WRONG_CREDENTIALS)
      return
    }
    signIn()
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
      <FormField icon={Mail} label={<span className="mb-1.5 block text-sm font-medium text-ink">Email</span>}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 w-full min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-faint"
          placeholder="you@farm.com"
          autoComplete="email"
        />
      </FormField>

      <FormField
        icon={Lock}
        label={
          <span className="mb-1.5 flex items-center justify-between text-sm font-medium text-ink">
            Password
            <button type="button" className="text-xs font-medium text-forest hover:underline">
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

      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-forest text-sm font-semibold text-white transition-[background-color,transform] duration-150 ease-out hover:bg-forest-hover active:scale-[0.98] disabled:opacity-80"
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
          </>
        ) : (
          'Sign in'
        )}
      </button>

      <div className="flex items-center gap-3 py-1 text-xs text-faint">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <GoogleButton onClick={signIn} disabled={busy} />
    </form>
  )
}
