"use client";
import toast from 'react-hot-toast';

/**
 * Common API utility for authenticated requests
 */
export async function apiRequest(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('auth_token');

    // Production Fallback
    const PRODUCTION_URL = 'https://amusing-inspiration-production-a099.up.railway.app';
    
    // Determine if we are in local development
    const isLocal = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' || 
         window.location.hostname.startsWith('192.168.') || 
         window.location.hostname.startsWith('10.') || 
         window.location.hostname.endsWith('.local'));

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || (isLocal ? 'http://localhost:3001' : PRODUCTION_URL);

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
    };

    try {
        const response = await fetch(`${apiUrl}${endpoint}`, {
            ...options,
            headers,
        });

        if (response.status === 401) {
            // Handle unauthorized (optional: trigger logout)
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('auth_user');
                window.location.href = '/login';
            }
        }

        // Global error handling for non-ok responses
        if (!response.ok) {
            const clonedResponse = response.clone();
            try {
                const errorData = await clonedResponse.json();
                let errorMessage = 'Bilinmeyen bir hata oluştu';
                
                if (errorData) {
                    if (typeof errorData.error === 'object' && errorData.error !== null) {
                        errorMessage = errorData.error.message || errorData.error.code || JSON.stringify(errorData.error);
                    } else if (typeof errorData.error === 'string') {
                        errorMessage = errorData.error;
                    } else if (errorData.message) {
                        errorMessage = errorData.message;
                    } else if (errorData.details) {
                        errorMessage = errorData.details;
                    }
                }
                
                toast.error(String(errorMessage));
            } catch (e) {
                toast.error(`API Error: ${response.status} ${response.statusText}`);
            }
        }

        return response;
    } catch (error: any) {
        console.error('API Request Error:', error);
        toast.error('Bağlantı hatası: Sunucuya ulaşılamıyor');
        throw error;
    }
}
