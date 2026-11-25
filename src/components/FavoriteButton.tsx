import clsx from 'clsx'
import { favoritePlayers, favoriteTeams, type FavoritePlayer, type FavoriteTeam } from '../lib/storage'
import { normalizeName } from '../lib/match'
import { IconStar } from './icons'

function Star({ on, toggle, label }: { on: boolean; toggle: () => void; label: string }) {
  return (
    <button
      onClick={toggle}
      aria-pressed={on}
      title={on ? 'Eltávolítás a kedvencek közül' : 'Hozzáadás a kedvencekhez'}
      className={clsx(
        'btn-secondary',
        on && 'border-amber-300 text-amber-600 dark:border-amber-500/40 dark:text-amber-400',
      )}
    >
      <IconStar filled={on} className="size-4" />
      <span className="hidden sm:inline">{on ? 'Kedvenc' : label}</span>
    </button>
  )
}

export function FavoriteTeamButton({ team }: { team: FavoriteTeam }) {
  const list = favoriteTeams.use()
  const on = list.some((t) => normalizeName(t.name) === normalizeName(team.name))
  const toggle = () =>
    favoriteTeams.set(on ? list.filter((t) => normalizeName(t.name) !== normalizeName(team.name)) : [...list, team])
  return <Star on={on} toggle={toggle} label="Követés" />
}

export function FavoritePlayerButton({ player }: { player: FavoritePlayer }) {
  const list = favoritePlayers.use()
  const on = list.some((p) => p.id === player.id)
  const toggle = () => favoritePlayers.set(on ? list.filter((p) => p.id !== player.id) : [...list, player])
  return <Star on={on} toggle={toggle} label="Követés" />
}
