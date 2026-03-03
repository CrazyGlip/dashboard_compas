import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, type Role } from '../contexts/AuthContext';

interface ProtectedRouteProps {
    allowedRoles?: Role[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
    const { user, loading, hasAccess } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !hasAccess(allowedRoles)) {
        // If the user is logged in but lacks the required role, redirect to dashboard.
        // Dashboard itself will only show what they have access to.
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
