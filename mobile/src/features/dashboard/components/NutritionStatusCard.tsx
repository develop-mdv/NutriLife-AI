import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ProgressRing } from '../../../components/ProgressRing';
import { ProgressBar } from '../../../components/ProgressBar';
import { useTheme } from '../../../context/ThemeContext';
import { AppTheme } from '../../../constants/Theme';

interface NutritionStatusCardProps {
    caloriesConsumedToday: number;
    calorieGoal: number;
    caloriesLeftToday: number;
    ringProgress: number;
    showConsumed: boolean;
    setShowConsumed: React.Dispatch<React.SetStateAction<boolean>>;
    totalProtein: number;
    totalFat: number;
    totalCarbs: number;
    macroGoals: { protein: number; fat: number; carbs: number };
}

export const NutritionStatusCard: React.FC<NutritionStatusCardProps> = ({
    caloriesConsumedToday,
    calorieGoal,
    caloriesLeftToday,
    ringProgress,
    showConsumed,
    setShowConsumed,
    totalProtein,
    totalFat,
    totalCarbs,
    macroGoals,
}) => {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    return (
        <View style={styles.cardEmphasis}>
            <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>СТАТУС ПИТАНИЯ</Text>
                <Text style={styles.smallText}>{caloriesConsumedToday} / {calorieGoal} ККАЛ</Text>
            </View>

            <View style={styles.ringAndTextRow}>
                <TouchableOpacity
                    style={styles.ringWrapper}
                    activeOpacity={0.8}
                    onPress={() => setShowConsumed((prev) => !prev)}
                >
                    <ProgressRing
                        radius={80}
                        stroke={18}
                        progress={ringProgress}
                        color={theme.colors.accentNutrition}
                        trackColor={theme.colors.border}
                    />
                    <View style={styles.ringInner}>
                        <Text style={styles.ringCalories}>
                            {showConsumed ? caloriesConsumedToday : caloriesLeftToday}
                        </Text>
                        <Text style={styles.ringLabel}>
                            {showConsumed ? 'ПОТРЕБЛЕНО' : 'ОСТАЛОСЬ'}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>

            <View style={styles.macrosRow}>
                <View style={styles.macroCol}>
                    <Text style={[styles.macroLabel, { color: theme.colors.accentNutrition }]}>БЕЛКИ</Text>
                    <Text style={styles.macroValue}>
                        {Math.round(totalProtein)}
                        <Text style={styles.macroGoalText}>/{macroGoals.protein}g</Text>
                    </Text>
                    <ProgressBar current={totalProtein} max={macroGoals.protein} color={theme.colors.accentNutrition} />
                </View>

                <View style={styles.macroCol}>
                    <Text style={[styles.macroLabel, { color: theme.colors.accentActivity }]}>ЖИРЫ</Text>
                    <Text style={styles.macroValue}>
                        {Math.round(totalFat)}
                        <Text style={styles.macroGoalText}>/{macroGoals.fat}g</Text>
                    </Text>
                    <ProgressBar current={totalFat} max={macroGoals.fat} color={theme.colors.accentActivity} />
                </View>

                <View style={styles.macroCol}>
                    <Text style={[styles.macroLabel, { color: theme.colors.accentSystem }]}>УГЛЕВОДЫ</Text>
                    <Text style={styles.macroValue}>
                        {Math.round(totalCarbs)}
                        <Text style={styles.macroGoalText}>/{macroGoals.carbs}g</Text>
                    </Text>
                    <ProgressBar current={totalCarbs} max={macroGoals.carbs} color={theme.colors.accentSystem} />
                </View>
            </View>
        </View>
    );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
    cardEmphasis: {
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: theme.colors.accentNutrition,
        shadowColor: theme.colors.accentNutrition,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 4,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        letterSpacing: 1,
    },
    pequeñaText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: '600',
        fontFamily: 'monospace',
    },
    smallText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: '600',
        fontFamily: 'monospace',
    },
    ringAndTextRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    ringWrapper: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    ringInner: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    ringCalories: {
        fontSize: 36,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        fontFamily: 'monospace',
    },
    ringLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        letterSpacing: 1,
        marginTop: 2,
    },
    macrosRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    macroCol: {
        flex: 1,
        marginHorizontal: 4,
    },
    macroLabel: {
        fontSize: 10,
        fontWeight: '800',
        marginBottom: 4,
        letterSpacing: 1,
    },
    macroValue: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        fontFamily: 'monospace',
        marginBottom: 6,
    },
    macroGoalText: {
        fontSize: 10,
        color: theme.colors.textMuted,
        fontWeight: 'normal',
    },
});
