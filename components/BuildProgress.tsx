'use client'

import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import type { BuildResult } from '@/lib/types'

interface BuildProgressProps {
  result: BuildResult
}

export default function BuildProgress({ result }: BuildProgressProps) {
  if (result.status === 'pending' || result.status === 'building') {
    return (
      <div className="flex flex-col items-center py-16">
        <Loader2 className="mb-4 h-12 w-12 animate-spin text-brand-400" />
        <h2 className="mb-2 text-xl font-semibold">Building Your Agent</h2>
        <p className="text-sm text-slate-400">
          Assembling personality, skills, and identity...
        </p>
      </div>
    )
  }

  if (result.status === 'error') {
    return (
      <div className="flex flex-col items-center py-16">
        <XCircle className="mb-4 h-12 w-12 text-red-400" />
        <h2 className="mb-2 text-xl font-semibold">Build Failed</h2>
        <p className="text-sm text-slate-400">{result.error || 'An unexpected error occurred.'}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center py-16">
      <CheckCircle2 className="mb-4 h-12 w-12 text-emerald-400" />
      <h2 className="mb-2 text-xl font-semibold">Agent Ready!</h2>
      <p className="mb-1 text-sm text-slate-400">
        {result.personality?.emoji} {result.personality?.name}
      </p>
      <p className="text-xs text-slate-500">
        {result.skills?.length || 0} skills included
      </p>
    </div>
  )
}
