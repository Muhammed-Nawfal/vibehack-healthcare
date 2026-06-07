import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { configured, loading, session } = useAuth();
  const location = useLocation();

  if (!configured) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-bg-pearl)',
          color: 'var(--color-text)',
          gap: '12px',
          fontFamily: 'var(--font-body)',
        }}
      >
        <Loader2 size={22} className="concern__spinner" aria-hidden="true" />
        Loading your profile...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/signup" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
