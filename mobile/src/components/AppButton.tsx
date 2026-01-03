import React from 'react';
import { TouchableOpacity, Text, StyleSheet, GestureResponderEvent, ViewStyle, TextStyle } from 'react-native';

export interface AppButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
}

export const AppButton: React.FC<AppButtonProps> = ({ title, onPress, disabled, style, textStyle }) => {
  return (
    <TouchableOpacity
      style={[styles.appButton, disabled && styles.appButtonDisabled, style]}
      activeOpacity={0.8}
      onPress={disabled ? undefined : onPress}
    >
      <Text style={[styles.appButtonText, disabled && styles.appButtonTextDisabled, textStyle]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  appButton: {
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#22c55e',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appButtonText: {
    color: '#16a34a',
    fontWeight: '600',
    fontSize: 14,
  },
  appButtonDisabled: {
    opacity: 0.5,
  },
  appButtonTextDisabled: {
    color: '#9ca3af',
  },
});
