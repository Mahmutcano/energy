"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';

interface User {
    id: string;
    email: string;
    name?: string;
    role: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'NORMAL_USER';
    companyProfileId?: string;
}

interface CompanyProfile {
    id: string;
    name: string;
}

interface AuthContextType {
    user: User | null;
    companyProfile: CompanyProfile | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('auth_user');
        const storedCompany = localStorage.getItem('auth_company');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            if (storedCompany) {
                setCompanyProfile(JSON.parse(storedCompany));
            }
        }
        setLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        const response = await apiRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.message || 'Giriş yapılamadı');
        }

        setToken(data.token);
        setUser(data.user);
        setCompanyProfile(data.companyProfile);
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        if (data.companyProfile) {
            localStorage.setItem('auth_company', JSON.stringify(data.companyProfile));
        }
    };

    const register = async (name: string, email: string, password: string) => {
        const response = await apiRequest('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.message || 'Kayıt yapılamadı');
        }

        setToken(data.token);
        setUser(data.user);
        setCompanyProfile(data.companyProfile);
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        if (data.companyProfile) {
            localStorage.setItem('auth_company', JSON.stringify(data.companyProfile));
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        setCompanyProfile(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_company');
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{
            user,
            companyProfile,
            token,
            login,
            register,
            logout,
            isAuthenticated: !!token,
            loading
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
