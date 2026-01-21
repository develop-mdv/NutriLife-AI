export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
    // Base
    background: string;
    surface: string;
    surfaceAlt: string;
    overlay: string;

    // Text
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    border: string;

    // Functional Accents
    accentNutrition: string;
    accentActivity: string;
    accentSleep: string;
    accentSystem: string;
}

export interface ThemeEffects {
    shadow: any; // Using 'any' for React Native shadow styles flexibility, or strictly typed ViewStyle
    glow: boolean | string;
    blur: number;
}

export interface AppTheme {
    mode: ThemeMode;
    colors: ThemeColors;
    effects: ThemeEffects;
}

export const LightTheme: AppTheme = {
    mode: 'light',
    colors: {
        background: '#FFFFFF',
        surface: '#F6F8FA',
        surfaceAlt: '#EEF1F4',
        overlay: 'rgba(0,0,0,0.04)',

        textPrimary: '#0B0D10',
        textSecondary: '#4B5563',
        textMuted: '#9CA3AF',
        border: '#E5E7EB',

        accentNutrition: '#10B981', // Green
        accentActivity: '#F97316',  // Orange
        accentSleep: '#8B5CF6',     // Purple
        accentSystem: '#06B6D4',    // Blue
    },
    effects: {
        shadow: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.08,
            shadowRadius: 24,
            elevation: 2,
        },
        glow: false,
        blur: 8, // Low blur
    },
};

export const DarkTheme: AppTheme = {
    mode: 'dark',
    colors: {
        background: '#050807',
        surface: 'rgba(18, 24, 22, 0.7)',
        surfaceAlt: 'rgba(32, 48, 40, 0.5)',
        overlay: 'rgba(0, 0, 0, 0.8)',

        textPrimary: '#E6FFF2',
        textSecondary: '#A3D9C2',
        textMuted: '#5C7A6E',
        border: 'rgba(255, 255, 255, 0.1)',

        accentNutrition: '#00ff88',
        accentActivity: '#f97316',
        accentSleep: '#8b5cf6',
        accentSystem: '#06b6d4',
    },
    effects: {
        shadow: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: 3,
        },
        glow: true, // Indicates components should apply specific glow styles manually
        blur: 16, // Medium blur
    },
};
