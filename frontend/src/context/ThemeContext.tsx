"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme =
    | 'industrial-emerald'
    | 'classic-grid'
    | 'warning-hazard'
    | 'ghost-white'
    | 'cyber-neon'
    | 'midnight-oil'
    | 'oceanic-depth'
    | 'solar-flare'
    | 'toxic-waste'
    | 'monokai-pro'
    | 'matrix-overload'
    | 'frost-bit'
    | 'light-pure';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('industrial-emerald');

    useEffect(() => {
        const savedTheme = localStorage.getItem('scada_user_theme') as Theme;
        if (savedTheme) {
            setThemeState(savedTheme);
            document.documentElement.setAttribute('data-theme', savedTheme);
        }
    }, []);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('scada_user_theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
