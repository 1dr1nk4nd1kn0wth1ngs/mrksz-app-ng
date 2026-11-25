import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { ApiError } from './api/client'
import { Layout } from './components/Layout'
import './index.css'

const page = (load: () => Promise<{ default: React.ComponentType }>) => {
  const C = lazy(load)
  return <C />
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
      refetchOnWindowFocus: false,
    },
  },
})

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: page(() => import('./pages/HomePage')) },
      { path: '/competitions', element: page(() => import('./pages/CompetitionsPage')) },
      { path: '/competitions/:id', element: page(() => import('./pages/CompetitionPage')) },
      { path: '/matches', element: page(() => import('./pages/MatchesPage')) },
      { path: '/match/:id', element: page(() => import('./pages/MatchPage')) },
      { path: '/teams', element: page(() => import('./pages/TeamsPage')) },
      { path: '/teams/:name', element: page(() => import('./pages/TeamPage')) },
      { path: '/players', element: page(() => import('./pages/PlayersPage')) },
      { path: '/players/:id', element: page(() => import('./pages/PlayerPage')) },
      { path: '/associations', element: page(() => import('./pages/AssociationsPage')) },
      { path: '/associations/:id', element: page(() => import('./pages/AssociationPage')) },
      { path: '/register', element: page(() => import('./pages/RegisterPage')) },
      { path: '/licence-request', element: page(() => import('./pages/LicenceRequestPage')) },
      // URLs of the original app keep working.
      {
        path: '/leaguetable',
        element: page(() => import('./pages/LegacyRedirects').then((m) => ({ default: m.LeagueTableRedirect }))),
      },
      {
        path: '/results',
        element: page(() => import('./pages/LegacyRedirects').then((m) => ({ default: m.ResultsRedirect }))),
      },
      { path: '*', element: page(() => import('./pages/NotFoundPage')) },
    ],
  },
], {
  basename: import.meta.env.BASE_URL,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
