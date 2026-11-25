import clsx from 'clsx'
import { useId, type InputHTMLAttributes, type ReactNode } from 'react'

export function Field({
  label,
  error,
  hint,
  children,
  className,
}: {
  label: string
  error?: string | null
  hint?: ReactNode
  children: (id: string, invalid: boolean) => ReactNode
  className?: string
}) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children(id, !!error)}
      {error ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs muted">{hint}</p>
      ) : null}
    </div>
  )
}

export function TextField({
  label,
  error,
  hint,
  className,
  list,
  ...input
}: { label: string; error?: string | null; hint?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      {(id, invalid) => (
        <input
          id={id}
          list={list}
          aria-invalid={invalid}
          className={clsx('input', invalid && 'input-error')}
          {...input}
        />
      )}
    </Field>
  )
}

export function ResultBanner({ kind, children }: { kind: 'success' | 'error'; children: ReactNode }) {
  return (
    <div
      role="status"
      className={clsx(
        'rounded-xl border px-4 py-3 text-sm',
        kind === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
          : 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
      )}
    >
      {children}
    </div>
  )
}
