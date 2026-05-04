'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import type { BuildResult } from '@/lib/types'
import BuildProgress from '@/components/BuildProgress'
import InstallInstructions from '@/components/InstallInstructions'

function BuildContent() {
  const searchParams = useSearchParams()
  const buildId = searchParams.get('id') || ''
  const [result, setResult] = useState<BuildResult>({
    buildId,
    status: 'pending',
  })

  useEffect(() => {
    if (!buildId) return

    // In production, this would hit the Lambda API.
    // For MVP, the configure page passes build result via URL state.
    const storedResult = sessionStorage.getItem(`build-${buildId}`)
    if (storedResult) {
      try {
        setResult(JSON.parse(storedResult))
      } catch {
        setResult((prev) => ({ ...prev, status: 'error', error: 'Build data not found' }))
      }
    }
  }, [buildId])

  if (!buildId) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-slate-400">
          No build ID provided.{' '}
          <a href="/browse" className="text-brand-400 hover:underline">
            Build an agent
          </a>
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <BuildProgress result={result} />
      {result.status === 'complete' && <InstallInstructions result={result} />}
    </div>
  )
}

export default function BuildPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-6 py-10 text-slate-400">Loading...</div>
      }
    >
      <BuildContent />
    </Suspense>
  )
}
