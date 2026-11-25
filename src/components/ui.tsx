import clsx from 'clsx'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ApiError } from '../api/client'
import { initials } from '../lib/format'
import type { Outcome } from '../lib/match'
import { IconChevronLeft, IconChevronRight } from './icons'

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  eyebrow?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-sm font-medium text-accent-600 dark:text-accent-400">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Section({
  title,
  action,
  children,
  className,
}: {
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={clsx('mb-8', className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-lg font-semibold tracking-tight">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Avatar({
  src,
  name,
  size = 40,
  rounded = 'full',
  className,
}: {
  src?: string | null
  name: string
  size?: number
  rounded?: 'full' | 'xl'
  className?: string
}) {
  const [broken, setBroken] = useState(false)
  const style = { width: size, height: size, fontSize: Math.max(10, size * 0.36) }
  const shape = rounded === 'full' ? 'rounded-full' : 'rounded-xl'
  if (src && !broken) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setBroken(true)}
        style={style}
        className={clsx(shape, 'shrink-0 bg-white object-cover ring-1 ring-zinc-200 dark:ring-zinc-800', className)}
      />
    )
  }
  // Deterministic hue per name so placeholder avatars are distinguishable.
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360
  return (
    <span
      aria-hidden
      style={{ ...style, background: `oklch(0.9 0.05 ${h})`, color: `oklch(0.4 0.12 ${h})` }}
      className={clsx(
        shape,
        'inline-flex shrink-0 items-center justify-center font-semibold dark:opacity-90',
        className,
      )}
    >
      {initials(name) || '?'}
    </span>
  )
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: 'neutral' | 'accent' | 'live' | 'success' | 'danger' | 'warning'
  className?: string
}) {
  const tones = {
    neutral: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    accent: 'bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300',
    live: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    danger: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  }
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function LiveDot() {
  return <span className="inline-block size-1.5 animate-pulse-dot rounded-full bg-red-500" />
}

export function FormPill({ o }: { o: Outcome }) {
  const map = {
    W: ['Gy', 'bg-emerald-500 text-white', 'Győzelem'],
    L: ['V', 'bg-red-500 text-white', 'Vereség'],
    D: ['D', 'bg-zinc-400 text-white', 'Döntetlen'],
  } as const
  const [label, cls, title] = map[o]
  return (
    <span
      title={title}
      className={clsx('inline-flex size-5 items-center justify-center rounded-md text-[10px] font-bold', cls)}
    >
      {label}
    </span>
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Betöltés"
      className={clsx(
        'inline-block size-5 animate-spin rounded-full border-2 border-zinc-300 border-t-accent-600 dark:border-zinc-700 dark:border-t-accent-400',
        className,
      )}
    />
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded-xl bg-zinc-200/70 dark:bg-zinc-800/70', className)} />
}

export function SkeletonList({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={clsx('card divide-y divide-zinc-100 dark:divide-zinc-800', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 p-4">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="size-9 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg =
    error instanceof ApiError ? error.message : error instanceof Error ? error.message : 'Ismeretlen hiba történt.'
  return (
    <div className="card flex flex-col items-center gap-3 p-8 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-red-50 text-xl text-red-500 dark:bg-red-500/10">
        !
      </div>
      <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">{msg}</p>
      {onRetry && (
        <button className="btn-secondary" onClick={onRetry}>
          Újrapróbálás
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title, children, icon }: { title: ReactNode; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
      {icon && <div className="mb-1 text-zinc-400 dark:text-zinc-600">{icon}</div>}
      <p className="font-medium">{title}</p>
      {children && <div className="max-w-md text-sm muted">{children}</div>}
    </div>
  )
}

export interface TabItem<T extends string> {
  value: T
  label: ReactNode
  count?: number
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem<T>[]
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div
      role="tablist"
      className={clsx(
        'scrollbar-none inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900',
        className,
      )}
    >
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={clsx(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition',
            value === it.value
              ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50'
              : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200',
          )}
        >
          {it.label}
          {it.count !== undefined && <span className="text-xs text-zinc-400 tabular">{it.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Select<T extends string | number>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  label: string
  className?: string
}) {
  return (
    <label className={clsx('relative inline-flex items-center', className)}>
      <span className="sr-only">{label}</span>
      <select
        value={String(value)}
        onChange={(e) => {
          const raw = e.target.value
          const opt = options.find((o) => String(o.value) === raw)
          if (opt) onChange(opt.value)
        }}
        className="input appearance-none py-2 pr-9 font-medium"
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
      <IconChevronRight className="pointer-events-none absolute right-3 size-4 rotate-90 text-zinc-400" />
    </label>
  )
}

export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null
  const nums: (number | '…')[] = []
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i)
    else if (nums[nums.length - 1] !== '…') nums.push('…')
  }
  return (
    <nav className="mt-6 flex items-center justify-center gap-1" aria-label="Lapozás">
      <button className="btn-ghost px-2.5" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Előző">
        <IconChevronLeft className="size-4" />
      </button>
      {nums.map((n, i) =>
        n === '…' ? (
          <span key={`e${i}`} className="px-2 muted">
            …
          </span>
        ) : (
          <button
            key={n}
            onClick={() => onChange(n)}
            aria-current={n === page ? 'page' : undefined}
            className={clsx(
              'min-w-9 rounded-lg px-2.5 py-1.5 text-sm font-medium tabular transition',
              n === page
                ? 'bg-accent-600 text-white'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800',
            )}
          >
            {n}
          </button>
        ),
      )}
      <button
        className="btn-ghost px-2.5"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
        aria-label="Következő"
      >
        <IconChevronRight className="size-4" />
      </button>
    </nav>
  )
}

export function StatTile({ label, value, hint }: { label: ReactNode; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular">{value}</div>
      {hint && <div className="mt-0.5 text-xs muted">{hint}</div>}
    </div>
  )
}

export function TeamLink({
  name,
  season,
  className,
  children,
}: {
  name: string
  season?: number
  className?: string
  children?: ReactNode
}) {
  return (
    <Link
      to={`/teams/${encodeURIComponent(name)}${season ? `?season=${season}` : ''}`}
      className={clsx('hover:text-accent-600 hover:underline dark:hover:text-accent-400', className)}
      onClick={(e) => e.stopPropagation()}
    >
      {children ?? name}
    </Link>
  )
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
      <div
        className="h-full rounded-full bg-accent-500 transition-[width]"
        style={{ width: `${max ? Math.min(100, (value / max) * 100) : 0}%` }}
      />
    </div>
  )
}
