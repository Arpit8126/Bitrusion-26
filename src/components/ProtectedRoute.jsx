import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

export default function ProtectedRoute({ children, requireProfile = true }) {
  const { user, userProfile, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <div className="loading-text">Initializing...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Admins do not need a participant profile, so they bypass onboarding
  if (requireProfile && !userProfile && !isAdmin) {
    return <Navigate to="/onboarding" />;
  }

  return children;
}
