import React from 'react';
import { TouchableOpacity, Text, StyleSheet, GestureResponderEvent, ViewStyle, TextStyle } from 'react-native';
import { Colors } from '../constants/Colors';

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
  const getButtonStyle = () => {
    if (disabled) return styles.appButtonDisabled;
    switch (variant) {
      case 'secondary': return styles.appButtonSecondary;
      case 'glass': return styles.appButtonGlass;
      default: return styles.appButtonPrimary;
    }
  };

  const getTextStyle = () => {
    if (disabled) return styles.appButtonTextDisabled;
    switch (variant) {
      case 'secondary': return styles.appButtonTextSecondary;
      case 'glass': return styles.appButtonTextSecondary;
      default: return styles.appButtonTextPrimary;
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
    borderRadius: 24, // Neo-Tech requirement (20-28px)
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseText: {
    fontWeight: '600',
    fontSize: 14,
    textTransform: 'uppercase', // Tech feel
    letterSpacing: 0.5,
  },

  // Primary (Neon Glow)
  appButtonPrimary: {
    backgroundColor: 'rgba(0, 255, 136, 0.15)', // Low opacity neon fill
    borderWidth: 1,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8, // Glow effect
    elevation: 4,
  },
  appButtonTextPrimary: {
    color: Colors.primary,
    textShadowColor: Colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  // Secondary
  appButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  appButtonTextSecondary: {
    color: Colors.textSecondary,
  },

  // Glass
  appButtonGlass: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  // Disabled
  appButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'transparent',
  },
  appButtonTextDisabled: {
    color: Colors.textDim,
  },
});
