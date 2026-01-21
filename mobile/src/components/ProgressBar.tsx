import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface ProgressBarProps {
    current: number;
    max: number;
    color?: string;
    height?: number;
    trackColor?: string;
    style?: ViewStyle;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
    current,
    max,
    color,
    height = 8,
    trackColor,
    style
}) => {
    const { theme } = useTheme();
    const ratio = max > 0 ? Math.min(Math.max(current / max, 0), 1) : 0;

    // Defaults with fallback to theme if prop not provided
    const finalColor = color || theme.colors.accentNutrition;
    const finalTrackColor = trackColor || theme.colors.border; // Or a specific track token

    const shadowStyle = theme.effects.glow ? {
        shadowColor: finalColor,
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 3,
    } : {};

    return (
        <View style={[styles.track, { height, backgroundColor: finalTrackColor }, style]}>
            <View
                style={[
                    styles.progress,
                    {
                        width: `${ratio * 100}%`,
                        backgroundColor: finalColor,
                        ...shadowStyle,
                    }
                ]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    track: {
        width: '100%',
        borderRadius: 999,
        overflow: 'hidden',
    },
    progress: {
        height: '100%',
        borderRadius: 999,
    },
});
