import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchMe = useCallback(async () => {
        const token = localStorage.getItem('dental_token');
        if (!token) { setLoading(false); return; }
        try {
            const res = await client.get('/auth/me');
            setAdmin(res.data);
        } catch {
            localStorage.removeItem('dental_token');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchMe(); }, [fetchMe]);

    const login = async (username, password) => {
        const res = await client.post('/auth/login', { username, password });
        localStorage.setItem('dental_token', res.data.token);
        setAdmin(res.data.admin);
        return res.data.admin;
    };

    const logout = () => {
        localStorage.removeItem('dental_token');
        setAdmin(null);
    };

    return (
        <AuthContext.Provider value={{ admin, loading, login, logout, fetchMe }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
