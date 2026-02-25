import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { AppButton } from '../../../components/AppButton';
import { useTheme } from '../../../context/ThemeContext';
import { AppTheme } from '../../../constants/Theme';

export type FoodFilterType = 'today' | 'week' | 'custom';

interface MainFoodLogProps {
    foodLoading: boolean;
    filteredFoodEntries: any[];
    foodFilterType: FoodFilterType;
    setFoodFilterType: (val: FoodFilterType) => void;
}

export const MainFoodLog: React.FC<MainFoodLogProps> = ({
    foodLoading,
    filteredFoodEntries,
    foodFilterType,
    setFoodFilterType,
}) => {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [selectedFood, setSelectedFood] = useState<any>(null);

    const filterTabs: { key: FoodFilterType; label: string }[] = [
        { key: 'today', label: '24H' },
        { key: 'week', label: '7D' },
        { key: 'custom', label: '···' },
    ];

    return (
        <>
            <View style={styles.card}>
                <Text style={styles.cardTitle}>DATA LOGS</Text>
                <View style={styles.filterRowSmall}>
                    {filterTabs.map((f) => (
                        <TouchableOpacity
                            key={f.key}
                            style={[
                                styles.filterChipSmall,
                                foodFilterType === f.key && styles.filterChipSmallActive,
                            ]}
                            onPress={() => setFoodFilterType(f.key)}
                        >
                            <Text
                                style={[
                                    styles.filterChipSmallText,
                                    foodFilterType === f.key && styles.filterChipSmallTextActive,
                                ]}
                            >
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {foodLoading ? (
                    <ActivityIndicator color={theme.colors.accentNutrition} style={{ marginTop: 20 }} />
                ) : filteredFoodEntries.length === 0 ? (
                    <Text style={styles.noMealsText}>NO DATA AVAILABLE</Text>
                ) : (
                    filteredFoodEntries.map((item) => {
                        const ts = typeof item.timestamp === 'number' ? item.timestamp : new Date(item.timestamp).getTime();
                        return (
                            <TouchableOpacity
                                key={String(item.id ?? item.timestamp)}
                                style={styles.mealRow}
                                activeOpacity={0.8}
                                onPress={() => setSelectedFood(item)}
                            >
                                <View style={styles.mealRowInner}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.mealName}>{item.name}</Text>
                                        <Text style={styles.mealMeta}>
                                            {new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                    <Text style={styles.mealCalories}>{Math.round(item.calories)} CAL</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}
            </View>

            {/* MODAL (Simplified for Glassmorphism) */}
            {selectedFood && (
                <View style={styles.foodModalOverlay}>
                    <View style={styles.foodModalCard}>
                        <Text style={styles.foodModalTitle}>{selectedFood.name}</Text>
                        <Text style={styles.foodModalCaloriesText}>{Math.round(selectedFood.calories)} KCAL</Text>
                        <Text style={{ color: theme.colors.textSecondary, marginBottom: 20 }}>
                            P: {Math.round(selectedFood.protein)} / F: {Math.round(selectedFood.fat)} / C: {Math.round(selectedFood.carbs)}
                        </Text>
                        <AppButton title="CLOSE" onPress={() => setSelectedFood(null)} variant="secondary" />
                    </View>
                </View>
            )}
        </>
    );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
        shadowColor: theme.mode === 'dark' ? '#000' : '#CCC',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    filterRowSmall: {
        flexDirection: 'row',
        marginTop: 12,
        marginBottom: 16,
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: 12,
        padding: 4,
    },
    filterChipSmall: {
        flex: 1,
        paddingVertical: 6,
        alignItems: 'center',
        borderRadius: 8,
    },
    filterChipSmallActive: {
        backgroundColor: theme.colors.surface,
        shadowColor: theme.colors.accentNutrition,
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    filterChipSmallText: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        letterSpacing: 1,
    },
    filterChipSmallTextActive: {
        color: theme.colors.textPrimary,
    },
    noMealsText: {
        color: theme.colors.textMuted,
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 20,
        fontSize: 12,
        letterSpacing: 1,
    },
    mealRow: {
        backgroundColor: theme.colors.background,
        borderRadius: 16,
        padding: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    mealRowInner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    mealName: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    mealMeta: {
        fontSize: 12,
        color: theme.colors.textMuted,
        fontFamily: 'monospace',
    },
    mealCalories: {
        fontSize: 16,
        fontWeight: '800',
        color: theme.colors.accentNutrition,
        fontFamily: 'monospace',
    },
    // Modal
    foodModalOverlay: {
        position: 'absolute',
        top: 0, bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    },
    foodModalCard: {
        width: '85%',
        backgroundColor: theme.colors.surface,
        borderRadius: 32,
        padding: 24,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
    },
    foodModalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        marginBottom: 8,
        textAlign: 'center',
    },
    foodModalCaloriesText: {
        fontSize: 32,
        fontWeight: '800',
        color: theme.colors.accentNutrition,
        fontFamily: 'monospace',
        marginBottom: 16,
    },
});
