"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';

interface User {
    id: string;
    email: string;
    name?: string;
    fullName?: string;
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
    const [authState, setAuthState] = useState<{
        user: User | null;
        companyProfile: CompanyProfile | null;
        token: string | null;
        loading: boolean;
    }>({
        user: null,
        companyProfile: null,
        token: null,
        loading: true
    });

    const router = useRouter();

    useEffect(() => {
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('auth_user');
        const storedCompany = localStorage.getItem('auth_company');

        // Wrapping in setTimeout moves the update out of the synchronous effect body
        // and into the next task, avoiding the "cascading renders" warning.
        const timeoutId = setTimeout(() => {
            if (storedToken && storedUser) {
                try {
                    setAuthState({
                        token: storedToken,
                        user: JSON.parse(storedUser),
                        companyProfile: storedCompany ? JSON.parse(storedCompany) : null,
                        loading: false
                    });
                } catch (error) {
                    console.error('Error parsing stored auth data:', error);
                    setAuthState(prev => ({ ...prev, loading: false }));
                }
            } else {
                setAuthState(prev => ({ ...prev, loading: false }));
            }
        }, 0);

        return () => clearTimeout(timeoutId);
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

        setAuthState({
            token: data.token,
            user: data.user,
            companyProfile: data.companyProfile || null,
            loading: false
        });

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

        setAuthState({
            token: data.token,
            user: data.user,
            companyProfile: data.companyProfile || null,
            loading: false
        });

        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        if (data.companyProfile) {
            localStorage.setItem('auth_company', JSON.stringify(data.companyProfile));
        }
    };

    const logout = () => {
        setAuthState({
            token: null,
            user: null,
            companyProfile: null,
            loading: false
        });
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_company');
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{
            user: authState.user,
            companyProfile: authState.companyProfile,
            token: authState.token,
            loading: authState.loading,
            login,
            register,
            logout,
            isAuthenticated: !!authState.token,
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
