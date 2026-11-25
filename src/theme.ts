import { useEffect } from 'react'
import { createStoredValue } from './lib/storage'

export type ThemePref = 'system' | 'light' | 'dark'

// The preference lives in this store; apply() mirrors it as a raw string under
// `mrksz-theme`, which the inline script in index.html reads before first paint.
const themeStore = createStoredValue<ThemePref>('mrksz-theme-pref', 'system')

function apply(pref: ThemePref) {
  const dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  try {
    localStorage.setItem('mrksz-theme', pref)
  } catch {
    /* ignore */
  }
}

export function useTheme() {
  const pref = themeStore.use()
  useEffect(() => {
    apply(pref)
    if (pref !== 'system') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = () => apply('system')
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [pref])
  const cycle = () => themeStore.set(pref === 'system' ? 'dark' : pref === 'dark' ? 'light' : 'system')
  return { pref, setPref: themeStore.set, cycle }
}
