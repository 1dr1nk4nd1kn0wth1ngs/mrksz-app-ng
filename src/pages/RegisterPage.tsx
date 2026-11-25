import { useMutation } from '@tanstack/react-query'
import clsx from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useAssociations } from '../api/hooks'
import { api } from '../api/endpoints'
import { ApiError } from '../api/client'
import { Sport, type RegistrationPayload } from '../api/types'
import { Field, ResultBanner, TextField } from '../components/form'
import { IconCheck } from '../components/icons'
import { PageHeader, Spinner } from '../components/ui'
import {
  additional,
  birthdate,
  email,
  loadPostcodes,
  personName,
  postcode,
  required,
  settlementsForPostcode,
  STREET_SUFFIXES,
  streetName,
  streetNumber,
  validate,
  type Check,
} from '../lib/validation'

type Values = {
  emailaddress: string
  association: string
  lastname: string
  firstname: string
  motherslastname: string
  mothersfirstname: string
  birthdate: string
  birthplace: string
  gender: string
  postcode: string
  settlement: string
  streetname: string
  streetsuffix: string
  streetnumber: string
  additional: string
}

const empty: Values = {
  emailaddress: '',
  association: '',
  lastname: '',
  firstname: '',
  motherslastname: '',
  mothersfirstname: '',
  birthdate: '',
  birthplace: '',
  gender: '',
  postcode: '',
  settlement: '',
  streetname: '',
  streetsuffix: 'utca',
  streetnumber: '',
  additional: '',
}

const steps: { title: string; rules: Partial<Record<keyof Values, Check>> }[] = [
  { title: 'Versenyengedély', rules: { emailaddress: email, association: (v) => (v ? null : 'Válassz egyesületet') } },
  {
    title: 'Személyes adatok',
    rules: { lastname: personName, firstname: personName, motherslastname: personName, mothersfirstname: personName },
  },
  { title: 'Születési adatok', rules: { birthdate, birthplace: personName, gender: (v) => (v ? null : 'Válassz') } },
  {
    title: 'Lakcím',
    rules: { postcode, settlement: required, streetname: streetName, streetnumber: streetNumber, additional },
  },
]

const sportOptions = [
  { value: Sport.Ultimate, label: 'Ultimate' },
  { value: Sport.DiscGolf, label: 'Disc golf' },
  { value: Sport.Freestyle, label: 'Freestyle' },
]

export default function RegisterPage() {
  const assocs = useAssociations()
  const [v, setV] = useState<Values>(empty)
  const [sports, setSports] = useState<Sport[]>([Sport.Ultimate])
  const [step, setStep] = useState(0)
  const [touched, setTouched] = useState<Set<number>>(new Set())
  const [postcodes, setPostcodes] = useState<[number, string][]>([])

  useEffect(() => {
    void loadPostcodes().then(setPostcodes)
  }, [])

  const pcSettlements = useMemo(
    () => (/^\d{4}$/.test(v.postcode) ? settlementsForPostcode(Number(v.postcode), postcodes) : []),
    [v.postcode, postcodes],
  )
  const allSettlements = useMemo(
    () => [...new Set(postcodes.map(([, s]) => s))].sort((a, b) => a.localeCompare(b, 'hu')),
    [postcodes],
  )

  useEffect(() => {
    if (pcSettlements.length === 1) setV((x) => ({ ...x, settlement: pcSettlements[0]! }))
  }, [pcSettlements])

  const set = (k: keyof Values) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }))
  const errorsFor = (i: number) => validate(v, steps[i]!.rules)
  const stepValid = (i: number) => Object.keys(errorsFor(i)).length === 0 && (i !== 0 || sports.length > 0)
  const errors = touched.has(step) ? errorsFor(step) : {}

  const mutation = useMutation({
    mutationFn: (payload: RegistrationPayload) => api.register(payload),
  })

  const next = () => {
    setTouched((t) => new Set(t).add(step))
    if (stepValid(step)) setStep((s) => Math.min(s + 1, steps.length))
  }

  const submit = () => {
    const payload: RegistrationPayload = {
      firstname: v.firstname.trim(),
      lastname: v.lastname.trim(),
      birthdate: v.birthdate,
      birthplace: v.birthplace.trim(),
      gender: v.gender as 'male' | 'female',
      mothersfirstname: v.mothersfirstname.trim(),
      motherslastname: v.motherslastname.trim(),
      licences: sports,
      address: {
        postcode: Number(v.postcode),
        settlement: v.settlement.trim(),
        streetsuffix: v.streetsuffix,
        streetname: v.streetname.trim(),
        streetnumber: v.streetnumber.trim(),
        additional: v.additional.trim(),
      },
      association: Number(v.association),
      emailaddress: v.emailaddress.trim(),
    }
    mutation.mutate(payload)
  }

  if (mutation.isSuccess)
    return (
      <div className="mx-auto max-w-lg py-12 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
          <IconCheck className="size-7" />
        </div>
        <h1 className="text-2xl font-semibold">Sikeres regisztráció</h1>
        <p className="mt-2 muted">
          {typeof mutation.data === 'string' && mutation.data ? mutation.data : 'A regisztrációt rögzítettük.'}
        </p>
        <Link to="/" className="btn-primary mt-6">
          Kezdőlap
        </Link>
      </div>
    )

  const summary = step === steps.length

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Játékos regisztráció"
        subtitle="Versenyengedély igényléséhez szükséges nyilvántartásba vétel."
      />

      <ol className="mb-6 grid grid-cols-4 gap-2">
        {steps.map((s, i) => (
          <li key={s.title}>
            <button
              onClick={() => (i < step || stepValid(Math.max(0, i - 1))) && i <= step && setStep(i)}
              className="w-full text-left"
              disabled={i > step}
            >
              <div
                className={clsx(
                  'h-1.5 rounded-full',
                  i < step || summary
                    ? 'bg-accent-600'
                    : i === step
                      ? 'bg-accent-300 dark:bg-accent-700'
                      : 'bg-zinc-200 dark:bg-zinc-800',
                )}
              />
              <div
                className={clsx(
                  'mt-2 hidden text-xs font-medium sm:block',
                  i === step ? 'text-zinc-900 dark:text-zinc-100' : 'muted',
                )}
              >
                {i + 1}. {s.title}
              </div>
            </button>
          </li>
        ))}
      </ol>

      <div className="card p-5 sm:p-6">
        {step === 0 && (
          <div className="grid gap-4">
            <TextField
              label="E-mail cím"
              type="email"
              autoComplete="email"
              value={v.emailaddress}
              onChange={set('emailaddress')}
              error={errors.emailaddress}
            />
            <Field label="Egyesület" error={errors.association}>
              {(id, invalid) => (
                <select
                  id={id}
                  className={clsx('input', invalid && 'input-error')}
                  value={v.association}
                  onChange={set('association')}
                >
                  <option value="">{assocs.isLoading ? 'Betöltés…' : 'Válassz egyesületet'}</option>
                  {[...(assocs.data ?? [])]
                    .sort((a, b) => a.name.localeCompare(b.name, 'hu'))
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              )}
            </Field>
            <fieldset>
              <legend className="label">Sportág(ak)</legend>
              <div className="flex flex-wrap gap-2">
                {sportOptions.map((s) => {
                  const on = sports.includes(s.value)
                  return (
                    <button
                      type="button"
                      key={s.value}
                      aria-pressed={on}
                      onClick={() => setSports((x) => (on ? x.filter((y) => y !== s.value) : [...x, s.value]))}
                      className={clsx(
                        'btn border',
                        on
                          ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300'
                          : 'border-zinc-200 dark:border-zinc-800',
                      )}
                    >
                      {on && <IconCheck className="size-4" />} {s.label}
                    </button>
                  )
                })}
              </div>
              {touched.has(0) && sports.length === 0 && (
                <p className="mt-1 text-xs text-red-600">Válassz legalább egy sportágat</p>
              )}
            </fieldset>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Vezetéknév"
              autoComplete="family-name"
              value={v.lastname}
              onChange={set('lastname')}
              error={errors.lastname}
            />
            <TextField
              label="Keresztnév"
              autoComplete="given-name"
              value={v.firstname}
              onChange={set('firstname')}
              error={errors.firstname}
            />
            <TextField
              label="Anyja vezetékneve"
              value={v.motherslastname}
              onChange={set('motherslastname')}
              error={errors.motherslastname}
            />
            <TextField
              label="Anyja keresztneve"
              value={v.mothersfirstname}
              onChange={set('mothersfirstname')}
              error={errors.mothersfirstname}
            />
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Születési idő"
              type="date"
              value={v.birthdate}
              onChange={set('birthdate')}
              error={errors.birthdate}
            />
            <TextField
              label="Születési hely"
              list="settlements"
              value={v.birthplace}
              onChange={set('birthplace')}
              error={errors.birthplace}
            />
            <fieldset className="sm:col-span-2">
              <legend className="label">Nem</legend>
              <div className="flex gap-2">
                {[
                  ['female', 'Nő'],
                  ['male', 'Férfi'],
                ].map(([val, label]) => (
                  <label
                    key={val}
                    className={clsx(
                      'btn cursor-pointer border',
                      v.gender === val
                        ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300'
                        : 'border-zinc-200 dark:border-zinc-800',
                    )}
                  >
                    <input
                      type="radio"
                      name="gender"
                      value={val}
                      checked={v.gender === val}
                      onChange={set('gender')}
                      className="sr-only"
                    />
                    {label}
                  </label>
                ))}
              </div>
              {errors.gender && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.gender}</p>}
            </fieldset>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 sm:grid-cols-6">
            <TextField
              label="Irányítószám"
              inputMode="numeric"
              maxLength={4}
              className="sm:col-span-2"
              value={v.postcode}
              onChange={set('postcode')}
              error={errors.postcode}
            />
            <TextField
              label="Település"
              className="sm:col-span-4"
              list="settlements-pc"
              value={v.settlement}
              onChange={set('settlement')}
              error={errors.settlement}
            />
            <TextField
              label="Közterület neve"
              className="sm:col-span-3"
              value={v.streetname}
              onChange={set('streetname')}
              error={errors.streetname}
            />
            <Field label="Típusa" className="sm:col-span-3">
              {(id) => (
                <select id={id} className="input" value={v.streetsuffix} onChange={set('streetsuffix')}>
                  {STREET_SUFFIXES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              )}
            </Field>
            <TextField
              label="Házszám"
              className="sm:col-span-2"
              value={v.streetnumber}
              onChange={set('streetnumber')}
              error={errors.streetnumber}
            />
            <TextField
              label="Emelet, ajtó (nem kötelező)"
              className="sm:col-span-4"
              value={v.additional}
              onChange={set('additional')}
              error={errors.additional}
            />
          </div>
        )}

        {summary && (
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {[
              ['E-mail', v.emailaddress],
              ['Egyesület', assocs.data?.find((a) => String(a.id) === v.association)?.name],
              [
                'Sportág',
                sportOptions
                  .filter((s) => sports.includes(s.value))
                  .map((s) => s.label)
                  .join(', '),
              ],
              ['Név', `${v.lastname} ${v.firstname}`],
              ['Anyja neve', `${v.motherslastname} ${v.mothersfirstname}`],
              ['Született', `${v.birthplace}, ${v.birthdate}`],
              ['Nem', v.gender === 'female' ? 'Nő' : 'Férfi'],
              [
                'Lakcím',
                `${v.postcode} ${v.settlement}, ${v.streetname} ${v.streetsuffix} ${v.streetnumber} ${v.additional}`,
              ],
            ].map(([k, val]) => (
              <div key={k}>
                <dt className="text-xs muted">{k}</dt>
                <dd className="font-medium">{val}</dd>
              </div>
            ))}
          </dl>
        )}

        {mutation.isError && (
          <div className="mt-5">
            <ResultBanner kind="error">
              {mutation.error instanceof ApiError ? mutation.error.message : 'A regisztráció nem sikerült.'}
            </ResultBanner>
          </div>
        )}

        <div className="mt-6 flex justify-between gap-3">
          <button className="btn-ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            Vissza
          </button>
          {summary ? (
            <button className="btn-primary" onClick={submit} disabled={mutation.isPending}>
              {mutation.isPending && <Spinner className="size-4 border-white/40 border-t-white" />}
              Regisztráció elküldése
            </button>
          ) : (
            <button className="btn-primary" onClick={next}>
              Tovább
            </button>
          )}
        </div>
      </div>

      <datalist id="settlements">
        {v.birthplace.length >= 2 &&
          allSettlements
            .filter((s) => s.toLowerCase().includes(v.birthplace.toLowerCase()))
            .slice(0, 30)
            .map((s) => <option key={s} value={s} />)}
      </datalist>
      <datalist id="settlements-pc">
        {pcSettlements.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  )
}
