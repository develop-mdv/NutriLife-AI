import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

interface ProgressRingProps {
    radius?: number;
    stroke?: number;
    progress: number; // 0 to 1
    color?: string;
    trackColor?: string;
    style?: ViewStyle;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const ProgressRing: React.FC<ProgressRingProps> = ({
    radius = 80,
    stroke = 18,
    progress,
    color,
    trackColor,
    style,
}) => {
    const { theme } = useTheme();
    const animatedProgress = useRef(new Animated.Value(0)).current;

    const normalizedRadius = radius - stroke / 2;
    const circumference = normalizedRadius * 2 * Math.PI;

    // Use passed color or fallback to theme primary accent
    const activeColor = color || theme.colors.accentNutrition;
    const activeTrackColor = trackColor || theme.colors.border;
    const glowEnabled = theme.effects.glow;

    useEffect(() => {
        Animated.timing(animatedProgress, {
            toValue: progress, // Ensure this is between 0 and 1
            duration: 1000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [progress]);

    const strokeDashoffset = animatedProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [circumference, 0],
        extrapolate: 'clamp',
    });

    return (
        <View style={[styles.container, { width: radius * 2, height: radius * 2 }, style]}>
            <Svg width={radius * 2} height={radius * 2}>
                <G rotation="-90" origin={`${radius}, ${radius}`}>
                    {/* Track */}
                    <Circle
                        cx={radius}
                        cy={radius}
                        r={normalizedRadius}
                        stroke={activeTrackColor}
                        strokeWidth={stroke}
                        fill="transparent"
                        strokeOpacity={0.3}
                    />

                    {/* Glow Layers - only render if theme enables glow */}
                    {glowEnabled && (
                        <>
                            <AnimatedCircle
                                cx={radius}
                                cy={radius}
                                r={normalizedRadius}
                                stroke={activeColor}
                                strokeWidth={stroke + 6}
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                fill="transparent"
                                strokeOpacity={0.15}
                            />
                            <AnimatedCircle
                                cx={radius}
                                cy={radius}
                                r={normalizedRadius}
                                stroke={activeColor}
                                strokeWidth={stroke + 2}
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                fill="transparent"
                                strokeOpacity={0.2}
                            />
                        </>
                    )}

                    {/* Main Progress Stroke */}
                    <AnimatedCircle
                        cx={radius}
                        cy={radius}
                        r={normalizedRadius}
                        stroke={activeColor}
                        strokeWidth={stroke}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                    />
                </G>
            </Svg>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});
