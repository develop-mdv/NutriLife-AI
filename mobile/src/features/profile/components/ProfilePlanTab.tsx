import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { AppButton } from '../../../components/AppButton';
import { UserProfileApi, RoadmapApi } from '../../../api/me';

interface ProfilePlanTabProps {
    profile: UserProfileApi;
    generatingPlan: boolean;
    loadingRoadmap: boolean;
    roadmap: RoadmapApi | null;
    translateGoal: (goal: string | undefined) => string;
    setIsAdjustingPlan: (val: boolean) => void;
    onGeneratePlan: (force: boolean) => void;
    styles: any;
}

export const ProfilePlanTab: React.FC<ProfilePlanTabProps> = ({
    profile,
    generatingPlan,
    loadingRoadmap,
    roadmap,
    translateGoal,
    setIsAdjustingPlan,
    onGeneratePlan,
    styles,
}) => {
    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>Мой план</Text>
            {generatingPlan ? (
                <View style={styles.planPendingBox}>
                    <ActivityIndicator style={{ marginBottom: 8 }} />
                    <Text style={styles.planPendingTitle}>ИИ корректирует ваш план</Text>
                    <Text style={styles.planPendingText}>
                        Мы подстраиваем рекомендации под новую цель. Это может занять несколько секунд.
                    </Text>
                </View>
            ) : loadingRoadmap && !roadmap ? (
                <View style={styles.center}>
                    <ActivityIndicator />
                </View>
            ) : roadmap && roadmap.steps && roadmap.steps.length > 0 ? (
                <>
                    <View style={styles.planHeaderBox}>
                        <Text style={styles.planGoalLabel}>Текущая цель</Text>
                        <Text style={styles.planGoalValue}>{translateGoal(profile.goal)}</Text>
                        <Text style={styles.planTargetsText}>
                            Калории: {Math.round(roadmap.targets.dailyCalories)} · Вода: {Math.round(roadmap.targets.dailyWater)} мл · Шаги: {Math.round(roadmap.targets.dailySteps)} · Сон: {roadmap.targets.sleepHours} ч
                        </Text>
                    </View>
                    <View style={styles.planStepsWrapper}>
                        {roadmap.steps.map((step, index) => (
                            <View key={`${step.title}-${index}`} style={styles.planStepRow}>
                                <View style={styles.planStepCircle}>
                                    <Text style={styles.planStepCircleText}>{index + 1}</Text>
                                </View>
                                <View style={styles.planStepCard}>
                                    <Text style={styles.planStepTitle}>{step.title}</Text>
                                    <Text style={styles.planStepDescription}>{step.description}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                    <View style={styles.planFooterRow}>
                        <Text style={styles.planFooterText}>План можно в любой момент уточнить через ИИ.</Text>
                        <AppButton title="Изменить план" onPress={() => setIsAdjustingPlan(true)} />
                    </View>
                </>
            ) : (
                <View style={styles.planEmptyBox}>
                    <Text style={styles.planEmptyTitle}>Ваш путь к здоровью</Text>
                    <Text style={styles.planEmptyText}>
                        ИИ проанализирует ваши параметры и составит персональный план действий.
                    </Text>
                    <AppButton
                        title={generatingPlan ? 'Создаю план...' : 'Создать план'}
                        onPress={() => onGeneratePlan(false)}
                        disabled={generatingPlan}
                    />
                </View>
            )}
        </View>
    );
};
