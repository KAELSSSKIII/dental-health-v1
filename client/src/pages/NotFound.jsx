import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-bg">
            <div className="text-center">
                <p className="font-display text-8xl font-bold text-primary/20 mb-4">404</p>
                <h1 className="font-display text-2xl font-bold text-text-primary mb-2">Page Not Found</h1>
                <p className="text-text-secondary mb-6">Sorry, we couldn't find that page.</p>
                <Link to="/dashboard" className="btn-primary"><Home className="w-4 h-4" /> Go to Dashboard</Link>
            </div>
        </div>
    );
}
