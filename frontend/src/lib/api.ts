"use client";

/**
 * Common API utility for authenticated requests
 */
export async function apiRequest(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('auth_token');

    // Production Fallback
    const PRODUCTION_URL = 'https://amusing-inspiration-production-a099.up.railway.app';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ||
        (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')
            ? PRODUCTION_URL
            : 'http://localhost:3001');

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
    };

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

    // Intercept .json() to handle standardized response format
    const originalJson = response.json.bind(response);
    response.json = async () => {
        const result = await originalJson();
        if (result && typeof result === 'object' && result.success === true && 'data' in result) {
            return result.data;
        }
        return result;
    };

    return response;
}
