import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../constants/Colors';

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
    color = Colors.primary,
    height = 8,
    trackColor = 'rgba(255, 255, 255, 0.1)', // Slightly translucent track
    style
}) => {
    const ratio = max > 0 ? Math.min(Math.max(current / max, 0), 1) : 0;

    return (
        <View style={[styles.track, { height, backgroundColor: trackColor }, style]}>
            <View
                style={[
                    styles.progress,
                    {
                        width: `${ratio * 100}%`,
                        backgroundColor: color,
                        shadowColor: color,
                        shadowOpacity: 0.5,
                        shadowRadius: 6,
                        elevation: 3,
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
        overflow: 'hidden', // Ensures inner bar doesn't overflow corners
    },
    progress: {
        height: '100%',
        borderRadius: 999,
    },
});
