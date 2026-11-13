import type { Metadata } from 'next'
import Image from 'next/image'

import { LoginCard } from '@/components/login/LoginCard'
import { LoginForm } from '@/components/login/LoginForm'

export const metadata: Metadata = { title: 'Sign in' }

const BACKGROUND = 'https://cdn.magicpatterns.com/patterns/generated-images/efecf6f3-5c68-41d0-8b1f-36417efe55e3.jpg'

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-forest-deep px-4 py-10">
      {/* unoptimized: object-cover on tall phone screens scales the photo far beyond 100vw, so serve the original file */}
      <Image src={BACKGROUND} alt="" fill priority unoptimized className="object-cover" />
      <div className="absolute inset-0 bg-forest-deep/55" />
      <LoginCard>
        <h1 className="font-display text-[32px] leading-tight text-ink">Welcome back</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">Sign in to monitor your greenhouse, sensors and automated irrigation.</p>

        <LoginForm />

        
      </LoginCard>

      
    </main>
  )
}
