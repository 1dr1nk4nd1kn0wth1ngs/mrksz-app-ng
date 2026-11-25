import { useMutation } from '@tanstack/react-query'
import clsx from 'clsx'
import { useState } from 'react'
import { ApiError } from '../api/client'
import { api } from '../api/endpoints'
import { Sport, type LicenceRequestPayload } from '../api/types'
import { ResultBanner, TextField } from '../components/form'
import { PageHeader, Spinner } from '../components/ui'
import { birthdate, personName, validate } from '../lib/validation'

const empty = {
  lastName: '',
  firstName: '',
  mothersLastName: '',
  mothersFirstName: '',
  birthplace: '',
  birthdate: '',
}

export default function LicenceRequestPage() {
  const [v, setV] = useState(empty)
  const [sport, setSport] = useState<Sport>(Sport.Ultimate)
  const [touched, setTouched] = useState(false)
  const errs = validate(v, {
    lastName: personName,
    firstName: personName,
    mothersLastName: personName,
    mothersFirstName: personName,
    birthplace: personName,
    birthdate,
  })
  const errors = touched ? errs : {}
  const mutation = useMutation({ mutationFn: (p: LicenceRequestPayload) => api.requestLicence(p) })
  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) =>
    setV((x) => ({ ...x, [k]: e.target.value }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (Object.keys(errs).length) return
    mutation.mutate({
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      mothersFirstName: v.mothersFirstName.trim(),
      mothersLastName: v.mothersLastName.trim(),
      birthplace: v.birthplace.trim(),
      birthdate: new Date(v.birthdate).toISOString(),
      sport,
    })
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Versenyengedély igénylése"
        subtitle="Már regisztrált játékosként új szezonra vagy sportágra kérhetsz versenyengedélyt."
      />
      <form onSubmit={submit} className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-6" noValidate>
        <TextField
          label="Vezetéknév"
          value={v.lastName}
          onChange={set('lastName')}
          error={errors.lastName}
          autoComplete="family-name"
        />
        <TextField
          label="Keresztnév"
          value={v.firstName}
          onChange={set('firstName')}
          error={errors.firstName}
          autoComplete="given-name"
        />
        <TextField
          label="Anyja vezetékneve"
          value={v.mothersLastName}
          onChange={set('mothersLastName')}
          error={errors.mothersLastName}
        />
        <TextField
          label="Anyja keresztneve"
          value={v.mothersFirstName}
          onChange={set('mothersFirstName')}
          error={errors.mothersFirstName}
        />
        <TextField label="Születési hely" value={v.birthplace} onChange={set('birthplace')} error={errors.birthplace} />
        <TextField
          label="Születési idő"
          type="date"
          value={v.birthdate}
          onChange={set('birthdate')}
          error={errors.birthdate}
        />
        <fieldset className="sm:col-span-2">
          <legend className="label">Sportág</legend>
          <div className="flex flex-wrap gap-2">
            {[
              [Sport.Ultimate, 'Ultimate'],
              [Sport.DiscGolf, 'Disc golf'],
              [Sport.Freestyle, 'Freestyle'],
            ].map(([val, label]) => (
              <button
                type="button"
                key={val}
                aria-pressed={sport === val}
                onClick={() => setSport(val as Sport)}
                className={clsx(
                  'btn border',
                  sport === val
                    ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300'
                    : 'border-zinc-200 dark:border-zinc-800',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        {mutation.isSuccess && (
          <div className="sm:col-span-2">
            <ResultBanner kind="success">
              {typeof mutation.data === 'string' && mutation.data ? mutation.data : 'Az igénylést rögzítettük.'}
            </ResultBanner>
          </div>
        )}
        {mutation.isError && (
          <div className="sm:col-span-2">
            <ResultBanner kind="error">
              {mutation.error instanceof ApiError ? mutation.error.message : 'Az igénylés nem sikerült.'}
            </ResultBanner>
          </div>
        )}
        <div className="flex justify-end sm:col-span-2">
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending && <Spinner className="size-4 border-white/40 border-t-white" />}
            Igénylés elküldése
          </button>
        </div>
      </form>
    </div>
  )
}
