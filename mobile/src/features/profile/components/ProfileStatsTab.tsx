import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { ProgressBar } from '../../../components/ProgressBar';
import { DailyMetricsCard } from '../../../components/DailyMetricsCard';
import { DailyMetricsList } from '../../../components/DailyMetricsList';
import { UserProfileApi, DailyStats } from '../../../api/me';
import { AppTheme } from '../../../constants/Theme';

export interface AchievementMobile {
    id: string;
    title: string;
    description: string;
    icon: string;
    unlocked: boolean;
    current: number;
    max: number;
    unit: string;
}

interface ProfileStatsTabProps {
    theme: AppTheme;
    profile: UserProfileApi;
    todayStats: DailyStats;
    waterGoal: number;
    historyPeriod: 'week' | 'month';
    setHistoryPeriod: (p: 'week' | 'month') => void;
    historyLoading: boolean;
    historyAverages: { calories: number; steps: number; water: number; sleep: number | string };
    filteredHistory: DailyStats[];
    selectedCalorieIndex: number | null;
    setSelectedCalorieIndex: (i: number | null) => void;
    selectedStepsIndex: number | null;
    setSelectedStepsIndex: (i: number | null) => void;
    achievements: AchievementMobile[];
    setSelectedAchievement: (a: AchievementMobile) => void;
    formatShortDate: (date: string) => string;
    styles: any;
}

export const ProfileStatsTab: React.FC<ProfileStatsTabProps> = ({
    theme,
    profile,
    todayStats,
    waterGoal,
    historyPeriod,
    setHistoryPeriod,
    historyLoading,
    historyAverages,
    filteredHistory,
    selectedCalorieIndex,
    setSelectedCalorieIndex,
    selectedStepsIndex,
    setSelectedStepsIndex,
    achievements,
    setSelectedAchievement,
    formatShortDate,
    styles,
}) => {
    return (
        <>
            {/* Сегодня */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Сегодня</Text>
                <View style={styles.statRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.statLabel}>Калории</Text>
                        <Text style={styles.statValue}>
                            {Math.round(todayStats.calories)} / {profile.dailyCalorieGoal} ккал
                        </Text>
                        <ProgressBar
                            current={todayStats.calories}
                            max={profile.dailyCalorieGoal || 2000}
                            color={theme.colors.accentNutrition}
                        />
                    </View>
                </View>
                <View style={styles.statRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.statLabel}>Шаги</Text>
                        <Text style={styles.statValue}>
                            {todayStats.steps} / {profile.dailyStepGoal} шагов
                        </Text>
                        <ProgressBar
                            current={todayStats.steps}
                            max={profile.dailyStepGoal || 10000}
                            color={theme.colors.accentActivity}
                        />
                    </View>
                </View>
                <View style={styles.statRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.statLabel}>Вода</Text>
                        <Text style={styles.statValue}>
                            {todayStats.water} / {waterGoal} мл
                        </Text>
                        <ProgressBar
                            current={todayStats.water}
                            max={waterGoal || 2000}
                            color={theme.colors.accentSystem}
                        />
                    </View>
                </View>
            </View>

            {/* История: средние и период */}
            <View style={styles.card}>
                <View style={styles.historyHeaderRow}>
                    <Text style={styles.cardTitle}>История</Text>
                    <View style={styles.historyPeriodRow}>
                        <TouchableOpacity
                            style={[
                                styles.historyPeriodChip,
                                historyPeriod === 'week' && styles.historyPeriodChipActive,
                            ]}
                            onPress={() => setHistoryPeriod('week')}
                        >
                            <Text
                                style={[
                                    styles.historyPeriodText,
                                    historyPeriod === 'week' && styles.historyPeriodTextActive,
                                ]}
                            >
                                Неделя
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.historyPeriodChip,
                                historyPeriod === 'month' && styles.historyPeriodChipActive,
                            ]}
                            onPress={() => setHistoryPeriod('month')}
                        >
                            <Text
                                style={[
                                    styles.historyPeriodText,
                                    historyPeriod === 'month' && styles.historyPeriodTextActive,
                                ]}
                            >
                                Месяц
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {historyLoading ? (
                    <ActivityIndicator />
                ) : (
                    <>
                        <View style={styles.historyGrid}>
                            <View style={[styles.historyCard, { backgroundColor: theme.mode === 'dark' ? 'rgba(52, 211, 153, 0.15)' : '#ecfdf5' }]}>
                                <Text style={styles.historyLabel}>Ср. калории</Text>
                                <Text style={styles.historyValue}>{historyAverages.calories}</Text>
                                <Text style={styles.historyUnit}>ккал / день</Text>
                            </View>
                            <View style={[styles.historyCard, { backgroundColor: theme.mode === 'dark' ? 'rgba(248, 113, 113, 0.15)' : '#fef2f2' }]}>
                                <Text style={styles.historyLabel}>Ср. шаги</Text>
                                <Text style={styles.historyValue}>{historyAverages.steps}</Text>
                                <Text style={styles.historyUnit}>шагов / день</Text>
                            </View>
                            <View style={[styles.historyCard, { backgroundColor: theme.mode === 'dark' ? 'rgba(96, 165, 250, 0.15)' : '#e0f2fe' }]}>
                                <Text style={styles.historyLabel}>Ср. вода</Text>
                                <Text style={styles.historyValue}>{historyAverages.water}</Text>
                                <Text style={styles.historyUnit}>мл / день</Text>
                            </View>
                            <View style={[styles.historyCard, { backgroundColor: theme.mode === 'dark' ? 'rgba(167, 139, 250, 0.15)' : '#eef2ff' }]}>
                                <Text style={styles.historyLabel}>Ср. сон</Text>
                                <Text style={styles.historyValue}>{historyAverages.sleep}</Text>
                                <Text style={styles.historyUnit}>ч / ночь</Text>
                            </View>
                        </View>

                        {filteredHistory.length > 0 && (
                            <View style={styles.historyChartsWrapper}>
                                {/* Калории по дням */}
                                <DailyMetricsCard
                                    title="Калории по дням"
                                    theme={theme}
                                    topRightComponent={
                                        selectedCalorieIndex != null && filteredHistory[selectedCalorieIndex] ? (
                                            <View style={styles.historyChartTooltipBadge}>
                                                <Text style={styles.historyChartTooltipDate}>
                                                    {formatShortDate(filteredHistory[selectedCalorieIndex].date)}
                                                </Text>
                                                <Text style={styles.historyChartTooltipValue}>
                                                    {filteredHistory[selectedCalorieIndex].calories} ккал
                                                </Text>
                                            </View>
                                        ) : null
                                    }
                                >
                                    <DailyMetricsList
                                        data={filteredHistory.map(d => ({ date: d.date, value: d.calories || 0 }))}
                                        theme={theme}
                                        color={theme.mode === 'dark' ? 'rgba(52, 211, 153, 0.3)' : '#86efac'}
                                        selectedColor={theme.colors.accentNutrition}
                                        selectedIndex={selectedCalorieIndex}
                                        onSelectIndex={setSelectedCalorieIndex}
                                    />
                                </DailyMetricsCard>

                                {/* Шаги по дням */}
                                <DailyMetricsCard
                                    title="Шаги по дням"
                                    theme={theme}
                                    topRightComponent={
                                        selectedStepsIndex != null && filteredHistory[selectedStepsIndex] ? (
                                            <View style={[styles.historyChartTooltipBadge, { backgroundColor: theme.mode === 'dark' ? 'rgba(248, 113, 113, 0.15)' : '#fef2f2' }]}>
                                                <Text style={styles.historyChartTooltipDate}>
                                                    {formatShortDate(filteredHistory[selectedStepsIndex].date)}
                                                </Text>
                                                <Text style={[styles.historyChartTooltipValue, { color: theme.colors.accentActivity }]}>
                                                    {filteredHistory[selectedStepsIndex].steps} шагов
                                                </Text>
                                            </View>
                                        ) : null
                                    }
                                >
                                    <DailyMetricsList
                                        data={filteredHistory.map(d => ({ date: d.date, value: d.steps || 0 }))}
                                        theme={theme}
                                        color={theme.mode === 'dark' ? 'rgba(248, 113, 113, 0.3)' : '#fca5a5'}
                                        selectedColor={theme.colors.accentActivity}
                                        selectedIndex={selectedStepsIndex}
                                        onSelectIndex={setSelectedStepsIndex}
                                    />
                                </DailyMetricsCard>
                            </View>
                        )}
                    </>
                )}
            </View>

            {/* Достижения */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Достижения</Text>
                <View style={styles.achievementsGrid}>
                    {achievements.map((a) => (
                        <TouchableOpacity
                            key={a.id}
                            style={[
                                styles.achievementCard,
                                a.unlocked ? styles.achievementCardUnlocked : styles.achievementCardLocked,
                            ]}
                            activeOpacity={0.85}
                            onPress={() => setSelectedAchievement(a)}
                        >
                            <Text style={styles.achievementIcon}>{a.icon}</Text>
                            <Text style={styles.achievementTitle}>{a.title}</Text>
                            {!a.unlocked && a.max > 1 && (
                                <View style={styles.achievementProgressBarOuter}>
                                    <View
                                        style={[
                                            styles.achievementProgressBarInner,
                                            { width: `${(a.current / a.max) * 100}%` },
                                        ]}
                                    />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </>
    );
};
