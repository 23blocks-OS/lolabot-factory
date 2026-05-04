import { ArrowRight, Cpu, Puzzle, Terminal } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-24 sm:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-900/20 via-slate-950 to-slate-950" />
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-brand-400">
            AI Maestro Ecosystem
          </p>
          <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-7xl">
            Build Your AI Employee
            <br />
            <span className="gradient-text">in 60 Seconds</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-400">
            Pick a personality from 170+ specialists. Choose skills. Get a ready-to-install Claude
            Code plugin. No coding required.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="/browse"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-brand-500"
            >
              Browse Agents
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="https://github.com/23blocks-OS/ai-maestro-plugins"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-8 py-3 font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-slate-800 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-3xl font-bold">How It Works</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <StepCard
              step={1}
              icon={<Cpu className="h-6 w-6" />}
              title="Pick a Personality"
              description="Browse 170+ AI specialists across 15 divisions — engineering, marketing, sales, design, and more."
            />
            <StepCard
              step={2}
              icon={<Puzzle className="h-6 w-6" />}
              title="Add Skills"
              description="Equip your agent with messaging, memory, code analysis, planning, and other capabilities."
            />
            <StepCard
              step={3}
              icon={<Terminal className="h-6 w-6" />}
              title="Install & Go"
              description="Get a one-liner command that installs your custom agent as a Claude Code plugin. Done."
            />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-slate-800 px-6 py-16">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 md:grid-cols-4">
          <StatCard value="170+" label="Personalities" />
          <StatCard value="15" label="Divisions" />
          <StatCard value="7" label="Skills" />
          <StatCard value="60s" label="To Build" />
        </div>
      </section>

      {/* Ecosystem */}
      <section className="border-t border-slate-800 px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-brand-400">
            Part of
          </p>
          <h2 className="mb-4 text-2xl font-bold">AI Maestro</h2>
          <p className="text-slate-400">
            The OS for AI-first organizations. One Human, Many AI Agents.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between text-sm text-slate-500">
          <span>Lolabot Factory by 23blocks</span>
          <a
            href="https://github.com/23blocks-OS/lolabot-factory"
            className="hover:text-slate-300"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}

function StepCard({
  step,
  icon,
  title,
  description,
}: {
  step: number
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600/20 text-brand-400">
          {icon}
        </div>
        <span className="text-sm font-medium text-slate-500">Step {step}</span>
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  )
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-brand-400">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  )
}
