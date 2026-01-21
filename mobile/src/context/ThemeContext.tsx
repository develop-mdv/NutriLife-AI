import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppTheme, DarkTheme, LightTheme, ThemeMode } from '../constants/Theme';

interface ThemeContextType {
    theme: AppTheme;
    mode: ThemeMode;
    toggleTheme: () => void;
    setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: DarkTheme, // Default fallback
    mode: 'dark',
    toggleTheme: () => { },
    setMode: () => { },
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [mode, setModeState] = useState<ThemeMode>('dark');

    useEffect(() => {
        // Load persisted theme preference
        (async () => {
            try {
                const stored = await AsyncStorage.getItem('themePreference');
                if (stored === 'light' || stored === 'dark') {
                    setModeState(stored);
                }
            } catch (e) {
                console.warn('Failed to load theme preference', e);
            }
        })();
    }, []);

    const theme = mode === 'light' ? LightTheme : DarkTheme;

    const setMode = async (newMode: ThemeMode) => {
        setModeState(newMode);
        try {
            await AsyncStorage.setItem('themePreference', newMode);
        } catch (e) {
            console.warn('Failed to save theme preference', e);
        }
    };

    const toggleTheme = () => {
        setMode(mode === 'light' ? 'dark' : 'light');
    };

    return (
        <ThemeContext.Provider value={{ theme, mode, toggleTheme, setMode }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
