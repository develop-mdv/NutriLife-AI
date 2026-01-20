import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Colors } from '../constants/Colors';

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
    color = Colors.primary,
    trackColor = Colors.border,
    style,
}) => {
    const animatedProgress = useRef(new Animated.Value(0)).current;

    const normalizedRadius = radius - stroke / 2;
    const circumference = normalizedRadius * 2 * Math.PI;

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
                        stroke={trackColor}
                        strokeWidth={stroke}
                        fill="transparent"
                        strokeOpacity={0.3}
                    />
                    {/* Glow Layer: Wider stroke + lower opacity to simulate neon bloom */}
                    <AnimatedCircle
                        cx={radius}
                        cy={radius}
                        r={normalizedRadius}
                        stroke={color}
                        strokeWidth={stroke + 6}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                        strokeOpacity={0.15}
                    />
                    {/* Second Glow Layer */}
                    <AnimatedCircle
                        cx={radius}
                        cy={radius}
                        r={normalizedRadius}
                        stroke={color}
                        strokeWidth={stroke + 2}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                        strokeOpacity={0.2}
                    />
                    {/* Main Progress Stroke */}
                    <AnimatedCircle
                        cx={radius}
                        cy={radius}
                        r={normalizedRadius}
                        stroke={color}
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
