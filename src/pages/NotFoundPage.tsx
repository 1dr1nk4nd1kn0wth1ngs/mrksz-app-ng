import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <div className="bg-gradient-to-br from-accent-500 to-cyan-500 bg-clip-text text-7xl font-bold text-transparent">
        404
      </div>
      <p className="mt-3 text-lg font-medium">A keresett oldal nem található.</p>
      <Link to="/" className="btn-primary mt-6">
        Vissza a kezdőlapra
      </Link>
    </div>
  )
}
