import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children }) {
    const { admin, loading } = useAuth();
    const hasToken = !!localStorage.getItem('dental_token');

    // Still initialising, or token exists but admin state not committed yet
    if (loading || (hasToken && !admin)) {
        return <div className="min-h-screen flex items-center justify-center bg-bg"><LoadingSpinner size="lg" /></div>;
    }

    if (!admin) return <Navigate to="/login" replace />;
    return children;
}
