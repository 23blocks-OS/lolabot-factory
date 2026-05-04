'use client'

import { useState } from 'react'
import { Copy, Check, Download, ArrowRight } from 'lucide-react'
import type { BuildResult } from '@/lib/types'

interface InstallInstructionsProps {
  result: BuildResult
}

export default function InstallInstructions({ result }: InstallInstructionsProps) {
  const [copied, setCopied] = useState(false)

  const installCmd = `curl -fsSL ${result.installUrl} | bash`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(installCmd)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* One-liner */}
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-300">
          Quick Install
        </h3>
        <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 p-4">
          <code className="flex-1 overflow-x-auto text-sm text-emerald-400">{installCmd}</code>
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Manual download */}
      {result.downloadUrl && (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-300">
            Manual Download
          </h3>
          <a
            href={result.downloadUrl}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
          >
            <Download className="h-4 w-4" />
            Download ZIP
          </a>
          <p className="mt-2 text-xs text-slate-500">
            Extract to <code className="text-slate-400">~/.claude/plugins/ai-maestro/</code>
          </p>
        </div>
      )}

      {/* Next steps */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4">
        <h3 className="mb-3 text-sm font-semibold text-white">Next Steps</h3>
        <ol className="space-y-2 text-sm text-slate-400">
          <li className="flex gap-2">
            <span className="shrink-0 text-brand-400">1.</span>
            Run the install command above in your terminal
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 text-brand-400">2.</span>
            Restart Claude Code to activate your new agent
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 text-brand-400">3.</span>
            Use AI Maestro to manage multiple agents
          </li>
        </ol>
      </div>

      {/* Actions */}
      <div className="flex gap-4 pt-4">
        <a
          href="/browse"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
        >
          Build Another Agent
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  )
}
