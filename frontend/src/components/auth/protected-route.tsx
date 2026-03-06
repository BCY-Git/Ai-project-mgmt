import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import { Spinner } from '@/components/ui/spinner'

export function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode
  roles?: Array<'admin' | 'manager' | 'member'>
}): React.JSX.Element {
  const { accessToken, loading, user } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="page-loading">
        <Spinner />
      </div>
    )
  }

  if (!accessToken) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }

  if (roles && roles.length > 0 && (!user || !roles.includes(user.role))) {
    return <Navigate to="/403" replace />
  }

  return <>{children}</>
}
