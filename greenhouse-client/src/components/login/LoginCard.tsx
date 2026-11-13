'use client'

import React from 'react'
import { motion } from 'framer-motion'

/** The frosted sign-in card; fades and lifts in on first paint. */
export function LoginCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
      className="relative z-10 w-full max-w-[420px] rounded-xl border border-white/40 bg-surface/95 p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] backdrop-blur-md sm:p-9"
    >
      {children}
    </motion.section>
  )
}
