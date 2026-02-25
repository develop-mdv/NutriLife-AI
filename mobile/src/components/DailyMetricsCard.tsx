import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppTheme } from '../constants/Theme';

interface Props {
  title: string;
  theme: AppTheme;
  topRightComponent?: React.ReactNode;
  children: React.ReactNode;
}

export const DailyMetricsCard: React.FC<Props> = ({ title, theme, topRightComponent, children }) => {
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {topRightComponent}
      </View>
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  card: {
    marginTop: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  content: {
    // any general content styles
  },
});
