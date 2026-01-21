import React from 'react';
import { TouchableOpacity, Text, StyleSheet, GestureResponderEvent, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export interface AppButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  variant?: 'primary' | 'secondary' | 'glass';
}

export const AppButton: React.FC<AppButtonProps> = ({
  title,
  onPress,
  disabled,
  style,
  textStyle,
  variant = 'primary'
}) => {
  const { theme, mode } = useTheme();

  const getButtonStyle = (): ViewStyle => {
    if (disabled) return {
      backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      borderColor: 'transparent',
    };

    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.colors.border,
        };
      case 'glass':
        return {
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
        };
      case 'primary':
      default:
        const glowStyles = theme.effects.glow ? {
          shadowColor: theme.colors.accentNutrition,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 8,
          elevation: 4,
        } : {};

        return {
          backgroundColor: mode === 'dark' ? 'rgba(0, 255, 136, 0.15)' : theme.colors.accentNutrition,
          borderWidth: 1,
          borderColor: theme.colors.accentNutrition,
          ...glowStyles
        };
    }
  };

  const getTextStyle = (): TextStyle => {
    if (disabled) return { color: theme.colors.textMuted };

    switch (variant) {
      case 'secondary':
      case 'glass':
        return { color: theme.colors.textSecondary };
      case 'primary':
      default:
        // In light mode, primary button usually has white text if background is filled
        if (mode === 'light') return { color: '#FFFFFF' };

        return {
          color: theme.colors.accentNutrition,
          textShadowColor: theme.colors.accentNutrition,
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 8,
        };
    }
  };

  return (
    <TouchableOpacity
      style={[styles.baseButton, getButtonStyle(), style]}
      activeOpacity={0.8}
      onPress={disabled ? undefined : onPress}
    >
      <Text style={[styles.baseText, getTextStyle(), textStyle]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseText: {
    fontWeight: '600',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
