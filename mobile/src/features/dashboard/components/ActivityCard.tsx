import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ProgressBar } from '../../../components/ProgressBar';
import { useTheme } from '../../../context/ThemeContext';
import { AppTheme } from '../../../constants/Theme';

interface ActivityCardProps {
    steps: number;
    dailyStepGoal: number;
    onAddActivity: () => void;
    onSyncSteps: () => void;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
    steps,
    dailyStepGoal,
    onAddActivity,
    onSyncSteps,
}) => {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    // fallback daily step goal
    const maxSteps = dailyStepGoal || 10000;

    return (
        <View style={styles.card}>
            <View style={styles.cardHeaderRowAlt}>
                <Text style={styles.cardTitleSmall}>АКТИВНОСТЬ</Text>
                <Text style={styles.smallText}>{steps} / {maxSteps}</Text>
            </View>
            <View style={{ marginBottom: 16 }}>
                <ProgressBar
                    current={steps}
                    max={maxSteps}
                    color={theme.colors.accentActivity}
                />
            </View>
            <View style={styles.row}>
                <TouchableOpacity
                    style={[styles.trainingButtonWrapper, { flex: 1 }]}
                    activeOpacity={0.9}
                    onPress={onAddActivity}
                >
                    <LinearGradient
                        colors={[theme.colors.accentActivity, '#FB923C']} // Slight gradient for activity
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.trainingButton}
                    >
                        <Text style={styles.trainingButtonText}>ДОБАВИТЬ АКТИВНОСТЬ</Text>
                    </LinearGradient>
                </TouchableOpacity>
                <View style={{ width: 12 }} />
                <TouchableOpacity
                    style={styles.syncButton}
                    activeOpacity={0.85}
                    onPress={onSyncSteps}
                >
                    <Text style={styles.syncButtonText}>СИНХР.</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    cardHeaderRowAlt: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitleSmall: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        letterSpacing: 1,
    },
    smallText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: '600',
        fontFamily: 'monospace',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    trainingButtonWrapper: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    trainingButton: {
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    trainingButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 1,
    },
    syncButton: {
        backgroundColor: theme.colors.surfaceAlt,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    syncButtonText: {
        fontSize: 12,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        letterSpacing: 1,
    },
});
