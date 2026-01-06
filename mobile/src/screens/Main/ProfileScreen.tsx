import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Switch,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppButton } from '../../components/AppButton';
import { useAuth } from '../../context/AuthContext';
import { useTodayStats } from '../../hooks/useTodayStats';
import { useHistoryStats } from '../../hooks/useHistoryStats';
import {
  getProfile,
  getSettings,
  updateProfile,
  updateSettings,
  getRoadmap,
  generateRoadmap,
  RoadmapApi,
  UserProfileApi,
  SettingsApi,
} from '../../api/me';
import {
  scheduleWaterReminder,
  cancelWaterReminders,
  scheduleDailySleepNotification,
  cancelSleepNotifications,
  SleepNotificationType,
} from '../../hooks/useNotifications';

type ActiveTab = 'stats' | 'settings' | 'plan';

interface AchievementMobile {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  current: number;
  max: number;
  unit: string;
}
type HistoryPeriod = 'week' | 'month';

const ProgressBar: React.FC<{ current: number; max: number; color: string }> = ({ current, max, color }) => {
  const ratio = max > 0 ? Math.min(current / max, 1) : 0;
  return (
    <View style={styles.progressOuter}>
      <View style={[styles.progressInner, { width: `${ratio * 100}%`, backgroundColor: color }]} />
    </View>
  );
};

const translateGoal = (goal: string | undefined) => {
  switch (goal) {
    case 'lose_weight':
      return 'Похудение';
    case 'gain_muscle':
      return 'Набор массы';
    case 'maintain':
      return 'Поддержание';
    default:
      return 'Цель не задана';
  }
};

export const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { stats: todayStats } = useTodayStats();
  const { loading: historyLoading, history, summary } = useHistoryStats();

  const [activeTab, setActiveTab] = useState<ActiveTab>('stats');
  const [historyPeriod, setHistoryPeriod] = useState<HistoryPeriod>('week');

  const [profile, setProfile] = useState<UserProfileApi | null>(null);
  const [settings, setSettings] = useState<SettingsApi | null>(null);
  const [roadmap, setRoadmap] = useState<RoadmapApi | null>(null);
  const [initialProfile, setInitialProfile] = useState<UserProfileApi | null>(null);
  const [initialSettings, setInitialSettings] = useState<SettingsApi | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingRoadmap, setLoadingRoadmap] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [isAdjustingPlan, setIsAdjustingPlan] = useState(false);
  const [wishes, setWishes] = useState('');
  const [waterRemindersEnabled, setWaterRemindersEnabled] = useState(false);
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementMobile | null>(null);
  const [selectedCalorieIndex, setSelectedCalorieIndex] = useState<number | null>(null);
  const [selectedStepsIndex, setSelectedStepsIndex] = useState<number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingTab, setPendingTab] = useState<ActiveTab | null>(null);
  const [pendingLogout, setPendingLogout] = useState(false);
  const [pendingNavAction, setPendingNavAction] = useState<any | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [p, s, r, waterFlag] = await Promise.all([
          getProfile(),
          getSettings(),
          getRoadmap(),
          AsyncStorage.getItem('waterRemindersEnabled'),
        ]);
        setProfile(p.data);
        setSettings(s.data);
        setInitialProfile(p.data);
        setInitialSettings(s.data);
        setRoadmap(r.data || null);
        if (waterFlag === 'true') setWaterRemindersEnabled(true);
      } catch (e) {
        console.log('Ошибка загрузки профиля/настроек/плана', e);
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, []);

  const onSaveSettings = async () => {
    if (!profile || !settings) return;
    setSaving(true);
    try {
      await Promise.all([
        updateProfile(profile),
        updateSettings(settings),
      ]);
      setHasUnsavedChanges(false);
      // после сохранения актуализируем план под новые данные
      await onGeneratePlan(false);
    } catch (e) {
      console.log('Ошибка сохранения профиля/настроек', e);
    } finally {
      setSaving(false);
    }
  };

  const reloadProfileAndRoadmap = async () => {
    try {
      setLoadingRoadmap(true);
      const [p, s, r] = await Promise.all([getProfile(), getSettings(), getRoadmap()]);
      setProfile(p.data);
      setSettings(s.data);
      setInitialProfile(p.data);
      setInitialSettings(s.data);
      setRoadmap(r.data || null);
    } catch (e) {
      console.log('Ошибка обновления профиля/плана', e);
    } finally {
      setLoadingRoadmap(false);
    }
  };

  const onGeneratePlan = async (withWishes: boolean) => {
    if (!profile) return;
    setGeneratingPlan(true);
    try {
      const text = withWishes ? wishes.trim() : '';
      const resp = await generateRoadmap(text || undefined);
      setRoadmap(resp.data);
      setWishes('');
      setIsAdjustingPlan(false);
      // подтянем обновлённые цели профиля/настроек
      await reloadProfileAndRoadmap();
    } catch (e) {
      console.log('Ошибка генерации плана', e);
    } finally {
      setGeneratingPlan(false);
    }
  };

  const filteredHistory = useMemo(() => {
    const days = historyPeriod === 'week' ? 7 : 30;
    return [...history].slice(-days);
  }, [history, historyPeriod]);

  const historyAverages = useMemo(() => {
    if (filteredHistory.length === 0) {
      return { calories: 0, steps: 0, water: 0, sleep: 0 };
    }
    const total = filteredHistory.reduce(
      (acc, d) => ({
        calories: acc.calories + d.calories,
        steps: acc.steps + d.steps,
        water: acc.water + d.water,
        sleep: acc.sleep + d.sleepHours,
      }),
      { calories: 0, steps: 0, water: 0, sleep: 0 },
    );
    return {
      calories: Math.round(total.calories / filteredHistory.length),
      steps: Math.round(total.steps / filteredHistory.length),
      water: Math.round(total.water / filteredHistory.length),
      sleep: Number((total.sleep / filteredHistory.length).toFixed(1)),
    };
  }, [filteredHistory]);

  const formatShortDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const dt = new Date(dateStr);
    if (Number.isNaN(dt.getTime())) return '';
    const day = dt.getDate();
    const month = dt.getMonth() + 1;
    return `${day}.${month < 10 ? `0${month}` : month}`;
  };

  const hasRealUnsavedChanges = () => {
    if (!profile || !settings || !initialProfile || !initialSettings) return false;
    try {
      const currentProfile = JSON.stringify(profile);
      const savedProfile = JSON.stringify(initialProfile);
      const currentSettings = JSON.stringify(settings);
      const savedSettings = JSON.stringify(initialSettings);
      return currentProfile !== savedProfile || currentSettings !== savedSettings;
    } catch {
      return false;
    }
  };

  // Обновляем параметр маршрута, чтобы нижняя таб-навигция знала, что на вкладке "Настройки" есть несохранённые изменения
  useEffect(() => {
    const flag = activeTab === 'settings' && hasRealUnsavedChanges();
    navigation.setParams({ hasUnsavedSettings: flag });
  }, [activeTab, profile, settings, initialProfile, initialSettings, navigation]);

  // Обрабатываем запрос на переход на другой нижний таб при наличии несохранённых настроек
  useEffect(() => {
    const params: any = route.params;
    if (!params || !params.profilePendingNavAction) return;

    const navAction = params.profilePendingNavAction;

    if (activeTab === 'settings' && hasRealUnsavedChanges()) {
      setPendingTab(null);
      setPendingLogout(false);
      setPendingNavAction(navAction);
      setShowUnsavedModal(true);
    } else {
      // если почему-то уже нет изменений, просто выполняем переход
      navigation.dispatch(navAction);
    }

    // очищаем параметр, чтобы не сработало повторно
    navigation.setParams({ profilePendingNavAction: undefined });
  }, [route.params, activeTab, profile, settings, initialProfile, initialSettings, navigation]);

  const requestTabChange = (next: ActiveTab) => {
    if (next === activeTab) return;
    if (activeTab === 'settings' && hasRealUnsavedChanges()) {
      setPendingTab(next);
      setShowUnsavedModal(true);
    } else {
      setActiveTab(next);
    }
  };

  const requestLogout = () => {
    if (activeTab === 'settings' && hasRealUnsavedChanges()) {
      setPendingTab(null);
      setPendingLogout(true);
      setPendingNavAction(null);
      setShowUnsavedModal(true);
    } else {
      logout();
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      // Если выходим с профиля, находясь на вкладке "Настройки" с несохранёнными изменениями,
      // блокируем переход и показываем модалку.
      if (activeTab !== 'settings') return;
      if (!hasRealUnsavedChanges()) return;

      e.preventDefault();
      setPendingTab(null);
      setPendingLogout(false);
      setPendingNavAction(e.data.action);
      setShowUnsavedModal(true);
    });

    return unsubscribe;
  }, [navigation, activeTab, profile, settings, initialProfile, initialSettings]);

  const achievements: AchievementMobile[] = useMemo(() => {
    if (!profile || !settings) return [];

    const hasHistory = history.length > 0;
    const waterGoalMet = todayStats.water >= settings.waterGoal;
    const stepsGoalMet = todayStats.steps >= profile.dailyStepGoal;
    const calorieSniper =
      todayStats.calories > 0 &&
      Math.abs(todayStats.calories - profile.dailyCalorieGoal) <= profile.dailyCalorieGoal * 0.15;
    const roadmapCreated = !!roadmap && roadmap.steps && roadmap.steps.length > 0;
    const earlyBird =
      settings.sleep.wakeAlarmEnabled &&
      parseInt(settings.sleep.wakeTime.split(':')[0], 10) < 8;
    const weekStreak = history.length >= 7;
    const hydrationMaster = history.filter((d) => d.water >= 2000).length >= 3;

    return [
      {
        id: '1',
        title: 'Начало пути',
        description: 'Первая запись в истории',
        icon: '🚀',
        unlocked: hasHistory,
        current: hasHistory ? 1 : 0,
        max: 1,
        unit: 'шаг',
      },
      {
        id: '2',
        title: 'Водный баланс',
        description: 'Выполнена цель по воде сегодня',
        icon: '💧',
        unlocked: waterGoalMet,
        current: Math.min(todayStats.water, settings.waterGoal),
        max: settings.waterGoal || 1,
        unit: 'мл',
      },
      {
        id: '3',
        title: 'Активный образ',
        description: 'Выполнена цель по шагам сегодня',
        icon: '👟',
        unlocked: stepsGoalMet,
        current: Math.min(todayStats.steps, profile.dailyStepGoal),
        max: profile.dailyStepGoal || 1,
        unit: 'шагов',
      },
      {
        id: '4',
        title: 'Снайпер калорий',
        description: 'Попадание в норму калорий (±15%)',
        icon: '🎯',
        unlocked: calorieSniper,
        current: calorieSniper ? 1 : 0,
        max: 1,
        unit: 'цель',
      },
      {
        id: '5',
        title: 'Стратег',
        description: 'Создан персональный план здоровья',
        icon: '🗺️',
        unlocked: roadmapCreated,
        current: roadmapCreated ? 1 : 0,
        max: 1,
        unit: 'план',
      },
      {
        id: '6',
        title: 'Ранняя пташка',
        description: 'Будильник установлен до 08:00',
        icon: '🌅',
        unlocked: earlyBird,
        current: earlyBird ? 1 : 0,
        max: 1,
        unit: 'будильник',
      },
      {
        id: '7',
        title: 'Постоянство',
        description: 'Использование приложения 7 дней',
        icon: '🔥',
        unlocked: weekStreak,
        current: Math.min(history.length, 7),
        max: 7,
        unit: 'дн',
      },
      {
        id: '8',
        title: 'Аквамен',
        description: 'Более 2л воды 3 дня в истории',
        icon: '🔱',
        unlocked: hydrationMaster,
        current: history.filter((d) => d.water >= 2000).length,
        max: 3,
        unit: 'дн',
      },
    ];
  }, [profile, settings, history, todayStats, roadmap]);

  const scheduleOrCancelSleep = async (
    type: SleepNotificationType,
    enabled: boolean,
    time: string,
  ) => {
    try {
      const [hStr, mStr] = time.split(':');
      const hour = Number(hStr) || 0;
      const minute = Number(mStr) || 0;
      if (!enabled) {
        await cancelSleepNotifications(type);
      } else {
        await scheduleDailySleepNotification(type, hour, minute);
      }
    } catch (e) {
      console.log('Ошибка планирования уведомлений сна (профиль)', e);
    }
  };

  if (loadingProfile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!profile || !settings) {
    return (
      <View style={styles.center}>
        <Text>Не удалось загрузить профиль</Text>
        <View style={{ marginTop: 12 }}>
          <AppButton title="Выйти" onPress={logout} />
        </View>
      </View>
    );
  }

  const waterGoal = settings.waterGoal;

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{(profile.name || user?.name || 'N')[0]?.toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{profile.name || user?.name}</Text>
          {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
          <TouchableOpacity
            style={styles.goalChip}
            onPress={() => setShowGoalPicker(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.goalChipLabel}>Цель:</Text>
            <Text style={styles.goalChipValue}>{translateGoal(profile.goal)}</Text>
          </TouchableOpacity>
          <View style={styles.chipsRow}>
            <Text style={styles.chip}>{profile.height || 0} см</Text>
            <Text style={styles.chip}>{profile.weight || 0} кг</Text>
            <Text style={styles.chip}>{profile.age || 0} лет</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'stats' && styles.tabButtonActive]}
          onPress={() => requestTabChange('stats')}
        >
          <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>Статистика</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'plan' && styles.tabButtonActive]}
          onPress={() => requestTabChange('plan')}
        >
          <Text style={[styles.tabText, activeTab === 'plan' && styles.tabTextActive]}>Мой план</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'settings' && styles.tabButtonActive]}
          onPress={() => requestTabChange('settings')}
        >
          <Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}>Настройки</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'stats' ? (
        <>
          {/* Сегодня: цели и прогресс */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Цели на сегодня</Text>
            <View style={styles.statRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.statLabel}>Калории</Text>
                <Text style={styles.statValue}>
                  {todayStats.calories} / {profile.dailyCalorieGoal} ккал
                </Text>
                <ProgressBar
                  current={todayStats.calories}
                  max={profile.dailyCalorieGoal || 2000}
                  color="#34D399"
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
                  color="#EF4444"
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
                  color="#06B6D4"
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
                  <View style={[styles.historyCard, { backgroundColor: '#ecfdf5' }]}>
                    <Text style={styles.historyLabel}>Ср. калории</Text>
                    <Text style={styles.historyValue}>{historyAverages.calories}</Text>
                    <Text style={styles.historyUnit}>ккал / день</Text>
                  </View>
                  <View style={[styles.historyCard, { backgroundColor: '#fef2f2' }]}>
                    <Text style={styles.historyLabel}>Ср. шаги</Text>
                    <Text style={styles.historyValue}>{historyAverages.steps}</Text>
                    <Text style={styles.historyUnit}>шагов / день</Text>
                  </View>
                  <View style={[styles.historyCard, { backgroundColor: '#e0f2fe' }]}>
                    <Text style={styles.historyLabel}>Ср. вода</Text>
                    <Text style={styles.historyValue}>{historyAverages.water}</Text>
                    <Text style={styles.historyUnit}>мл / день</Text>
                  </View>
                  <View style={[styles.historyCard, { backgroundColor: '#eef2ff' }]}>
                    <Text style={styles.historyLabel}>Ср. сон</Text>
                    <Text style={styles.historyValue}>{historyAverages.sleep}</Text>
                    <Text style={styles.historyUnit}>ч / ночь</Text>
                  </View>
                </View>

                {filteredHistory.length > 0 && (
                  <View style={styles.historyChartsWrapper}>
                    {/* Калории по дням */}
                    <View style={styles.historyChartBox}>
                      <View style={styles.historyChartHeader}>
                        <Text style={styles.historyChartTitle}>Калории по дням</Text>
                        {selectedCalorieIndex != null &&
                          filteredHistory[selectedCalorieIndex] && (
                            <View style={styles.historyChartTooltipBadge}>
                              <Text style={styles.historyChartTooltipDate}>
                                {formatShortDate(filteredHistory[selectedCalorieIndex].date)}
                              </Text>
                              <Text style={styles.historyChartTooltipValue}>
                                {filteredHistory[selectedCalorieIndex].calories} ккал
                              </Text>
                            </View>
                          )}
                      </View>
                      {(() => {
                        const barWidth = 28;
                        const barGap = 8;
                        const maxHeight = 80;
                        const labelHeight = 20;
                        const maxValue = Math.max(
                          ...filteredHistory.map((d) => d.calories || 0),
                          1,
                        );
                        const chartWidth =
                          filteredHistory.length * (barWidth + barGap) + barGap;
                        return (
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.historyChartScroll}
                            contentContainerStyle={{ paddingHorizontal: 4 }}
                          >
                            <View style={styles.historyChartContainer}>
                              <Svg width={chartWidth} height={maxHeight + labelHeight}>
                                {filteredHistory.map((d, index) => {
                                  const value = d.calories || 0;
                                  const barHeight = Math.max((value / maxValue) * maxHeight, 4);
                                  const x = index * (barWidth + barGap) + barGap;
                                  const y = maxHeight - barHeight;
                                  const isSelected = index === selectedCalorieIndex;
                                  const dateStr = d.date ? new Date(d.date).getDate().toString() : '';
                                  return (
                                    <React.Fragment key={d.date || index}>
                                      <Rect
                                        x={x}
                                        y={isSelected ? y - 4 : y}
                                        width={barWidth}
                                        height={isSelected ? barHeight + 4 : barHeight}
                                        rx={6}
                                        fill={isSelected ? '#15803d' : '#34d399'}
                                        onPress={() => setSelectedCalorieIndex(index)}
                                      />
                                      <SvgText
                                        x={x + barWidth / 2}
                                        y={maxHeight + 14}
                                        fontSize={10}
                                        fill={isSelected ? '#111827' : '#9ca3af'}
                                        fontWeight={isSelected ? 'bold' : 'normal'}
                                        textAnchor="middle"
                                      >
                                        {dateStr}
                                      </SvgText>
                                    </React.Fragment>
                                  );
                                })}
                              </Svg>
                            </View>
                          </ScrollView>
                        );
                      })()}
                    </View>

                    {/* Шаги по дням */}
                    <View style={styles.historyChartBox}>
                      <View style={styles.historyChartHeader}>
                        <Text style={styles.historyChartTitle}>Шаги по дням</Text>
                        {selectedStepsIndex != null &&
                          filteredHistory[selectedStepsIndex] && (
                            <View style={[styles.historyChartTooltipBadge, { backgroundColor: '#fef2f2' }]}>
                              <Text style={styles.historyChartTooltipDate}>
                                {formatShortDate(filteredHistory[selectedStepsIndex].date)}
                              </Text>
                              <Text style={[styles.historyChartTooltipValue, { color: '#dc2626' }]}>
                                {filteredHistory[selectedStepsIndex].steps} шагов
                              </Text>
                            </View>
                          )}
                      </View>
                      {(() => {
                        const barWidth = 28;
                        const barGap = 8;
                        const maxHeight = 80;
                        const labelHeight = 20;
                        const maxValue = Math.max(
                          ...filteredHistory.map((d) => d.steps || 0),
                          1,
                        );
                        const chartWidth =
                          filteredHistory.length * (barWidth + barGap) + barGap;
                        return (
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.historyChartScroll}
                            contentContainerStyle={{ paddingHorizontal: 4 }}
                          >
                            <View style={styles.historyChartContainer}>
                              <Svg width={chartWidth} height={maxHeight + labelHeight}>
                                {filteredHistory.map((d, index) => {
                                  const value = d.steps || 0;
                                  const barHeight = Math.max((value / maxValue) * maxHeight, 4);
                                  const x = index * (barWidth + barGap) + barGap;
                                  const y = maxHeight - barHeight;
                                  const isSelected = index === selectedStepsIndex;
                                  const dateStr = d.date ? new Date(d.date).getDate().toString() : '';
                                  return (
                                    <React.Fragment key={d.date || index}>
                                      <Rect
                                        x={x}
                                        y={isSelected ? y - 4 : y}
                                        width={barWidth}
                                        height={isSelected ? barHeight + 4 : barHeight}
                                        rx={6}
                                        fill={isSelected ? '#b91c1c' : '#ef4444'}
                                        onPress={() => setSelectedStepsIndex(index)}
                                      />
                                      <SvgText
                                        x={x + barWidth / 2}
                                        y={maxHeight + 14}
                                        fontSize={10}
                                        fill={isSelected ? '#111827' : '#9ca3af'}
                                        fontWeight={isSelected ? 'bold' : 'normal'}
                                        textAnchor="middle"
                                      >
                                        {dateStr}
                                      </SvgText>
                                    </React.Fragment>
                                  );
                                })}
                              </Svg>
                            </View>
                          </ScrollView>
                        );
                      })()}
                    </View>
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
      ) : activeTab === 'plan' ? (
        <>
          {/* Мой план (roadmap) */}
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
        </>
      ) : (
        <>
          {/* Настройки: базовые данные */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Мои данные</Text>
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Имя</Text>
                <TextInput
                  style={styles.input}
                  value={profile.name}
                  onChangeText={(text) => {
                    setProfile({ ...profile, name: text });
                    setHasUnsavedChanges(true);
                  }}
                />
              </View>
            </View>
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Рост (см)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={String(profile.height || '')}
                  onChangeText={(text) => {
                    setProfile({ ...profile, height: Number(text) || 0 });
                    setHasUnsavedChanges(true);
                  }}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Вес (кг)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={String(profile.weight || '')}
                  onChangeText={(text) => {
                    setProfile({ ...profile, weight: Number(text) || 0 });
                    setHasUnsavedChanges(true);
                  }}
                />
              </View>
            </View>
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Возраст</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={String(profile.age || '')}
                  onChangeText={(text) => {
                    setProfile({ ...profile, age: Number(text) || 0 });
                    setHasUnsavedChanges(true);
                  }}
                />
              </View>
            </View>

            <View style={styles.genderSectionRow}>
              <Text style={styles.formLabel}>Пол</Text>
                <View style={styles.genderCardsRow}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[
                      styles.genderCard,
                      (profile.gender === 'male' || !profile.gender) && styles.genderCardSelected,
                    ]}
                    onPress={() => {
                      setProfile({ ...profile, gender: 'male' });
                      setHasUnsavedChanges(true);
                    }}
                >
                  <View style={styles.genderImageStub}>
                    <Image
                      source={require('../../../assets/images/male.png')}
                      style={styles.genderImage}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.genderCardFooter}>
                    <Text style={styles.genderLabel}>Мужской</Text>
                    {(profile.gender === 'male' || !profile.gender) && (
                      <View style={styles.genderCheckBadge}>
                        <Text style={styles.genderCheckText}>✓</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.9}
                  style={[
                    styles.genderCard,
                    profile.gender === 'female' && styles.genderCardSelected,
                  ]}
                  onPress={() => {
                    setProfile({ ...profile, gender: 'female' });
                    setHasUnsavedChanges(true);
                  }}
                >
                  <View style={styles.genderImageStub}>
                    <Image
                      source={require('../../../assets/images/female.png')}
                      style={styles.genderImage}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.genderCardFooter}>
                    <Text style={styles.genderLabel}>Женский</Text>
                    {profile.gender === 'female' && (
                      <View style={styles.genderCheckBadge}>
                        <Text style={styles.genderCheckText}>✓</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Цели */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Цели</Text>
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Калории в день</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={String(profile.dailyCalorieGoal || '')}
                  onChangeText={(text) => {
                    setProfile({
                      ...profile,
                      dailyCalorieGoal: Number(text) || 0,
                    });
                    setHasUnsavedChanges(true);
                  }}
                />
              </View>
            </View>
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Шаги в день</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={String(profile.dailyStepGoal || '')}
                  onChangeText={(text) => {
                    setProfile({
                      ...profile,
                      dailyStepGoal: Number(text) || 0,
                    });
                    setHasUnsavedChanges(true);
                  }}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Вода (мл/день)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={String(settings.waterGoal || '')}
                  onChangeText={(text) => {
                    setSettings({
                      ...settings,
                      waterGoal: Number(text) || 0,
                    });
                    setHasUnsavedChanges(true);
                  }}
                />
              </View>
            </View>
          </View>

          {/* Персонализация */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Персонализация</Text>
            <View style={styles.formFieldFull}>
              <Text style={styles.formLabel}>Аллергии</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                value={profile.allergies || ''}
                onChangeText={(text) => {
                  setProfile({ ...profile, allergies: text });
                  setHasUnsavedChanges(true);
                }}
                placeholder="Орехи, мед..."
              />
            </View>
            <View style={styles.formFieldFull}>
              <Text style={styles.formLabel}>Предпочтения</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                value={profile.preferences || ''}
                onChangeText={(text) => {
                  setProfile({ ...profile, preferences: text });
                  setHasUnsavedChanges(true);
                }}
                placeholder="Вегетарианец, люблю острое..."
              />
            </View>
            <View style={styles.formFieldFull}>
              <Text style={styles.formLabel}>Здоровье</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                value={profile.healthConditions || ''}
                onChangeText={(text) => {
                  setProfile({ ...profile, healthConditions: text });
                  setHasUnsavedChanges(true);
                }}
                placeholder="Диабет, травма колена..."
              />
            </View>
          </View>

          {/* Сон и напоминания */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Сон и напоминания</Text>
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Цель сна (ч)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={String(settings.sleep.targetHours || '')}
                  onChangeText={(text) => {
                    setSettings({
                      ...settings,
                      sleep: {
                        ...settings.sleep,
                        targetHours: Number(text) || 0,
                      },
                    });
                    setHasUnsavedChanges(true);
                  }}
                />
              </View>
            </View>
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Отбой (ч:мм)</Text>
                <TextInput
                  style={styles.input}
                  value={settings.sleep.bedTime}
                  onChangeText={async (text) => {
                    setSettings({
                      ...settings,
                      sleep: { ...settings.sleep, bedTime: text },
                    });
                    setHasUnsavedChanges(true);
                    if (settings.sleep.bedTimeReminderEnabled) {
                      await scheduleOrCancelSleep('sleep_bed', true, text);
                    }
                  }}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Подъём (ч:мм)</Text>
                <TextInput
                  style={styles.input}
                  value={settings.sleep.wakeTime}
                  onChangeText={async (text) => {
                    setSettings({
                      ...settings,
                      sleep: { ...settings.sleep, wakeTime: text },
                    });
                    setHasUnsavedChanges(true);
                    if (settings.sleep.wakeAlarmEnabled) {
                      await scheduleOrCancelSleep('sleep_wake', true, text);
                    }
                  }}
                />
              </View>
            </View>
            {/* Напоминания о сне и воде */}
            <View style={styles.switchRow}>
              <Text style={styles.formLabel}>Напоминать перед сном</Text>
              <Switch
                value={settings.sleep.bedTimeReminderEnabled}
                onValueChange={async (value) => {
                  setSettings({
                    ...settings,
                    sleep: { ...settings.sleep, bedTimeReminderEnabled: value },
                  });
                  await scheduleOrCancelSleep('sleep_bed', value, settings.sleep.bedTime);
                }}
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.formLabel}>Будильник по утрам</Text>
              <Switch
                value={settings.sleep.wakeAlarmEnabled}
                onValueChange={async (value) => {
                  setSettings({
                    ...settings,
                    sleep: { ...settings.sleep, wakeAlarmEnabled: value },
                  });
                  await scheduleOrCancelSleep('sleep_wake', value, settings.sleep.wakeTime);
                }}
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.formLabel}>Оповещения о воде</Text>
              <Switch
                value={waterRemindersEnabled}
                onValueChange={async (value) => {
                  try {
                    if (value) {
                      await scheduleWaterReminder(120);
                    } else {
                      await cancelWaterReminders();
                    }
                    setWaterRemindersEnabled(value);
                    await AsyncStorage.setItem('waterRemindersEnabled', value ? 'true' : 'false');
                  } catch (e) {
                    console.log('Ошибка переключения напоминаний о воде (профиль)', e);
                  }
                }}
              />
            </View>
          </View>

          <View style={{ marginTop: 8 }}>
            <AppButton
              title={saving ? 'Сохранение...' : 'Сохранить профиль'}
              onPress={onSaveSettings}
              disabled={saving}
            />
          </View>
        </>
      )}

      <View style={{ marginTop: 24 }}>
        <AppButton title="Выйти" onPress={requestLogout} />
      </View>
    </ScrollView>

    {isAdjustingPlan && (
      <View style={styles.planOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={() => setIsAdjustingPlan(false)}
        />
        <View style={styles.planOverlayCard}>
          <Text style={styles.planOverlayTitle}>Настройка плана</Text>
          <Text style={styles.planOverlayText}>
            Расскажите ИИ о своих целях, ограничениях и пожеланиях. Это поможет адаптировать стратегию.
          </Text>
          <TextInput
            style={[styles.input, styles.planOverlayInput]}
            multiline
            placeholder="Например: не могу бегать из-за коленей, хочу тренировки дома, не ем рыбу..."
            value={wishes}
            onChangeText={setWishes}
          />
          <View style={styles.planOverlayButtonsRow}>
            <AppButton title="Отмена" onPress={() => setIsAdjustingPlan(false)} />
            <AppButton
              title={generatingPlan ? 'Обновляю...' : 'Обновить план'}
              onPress={() => {
                setIsAdjustingPlan(false);
                onGeneratePlan(true);
              }}
              disabled={generatingPlan}
            />
          </View>
        </View>
      </View>
    )}

    {showUnsavedModal && (
      <View style={styles.planOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={() => {
            setShowUnsavedModal(false);
            setPendingTab(null);
            setPendingLogout(false);
            setPendingNavAction(null);
          }}
        />
        <View style={styles.goalOverlayCard}>
          <Text style={styles.goalOverlayTitle}>Сохранить изменения?</Text>
          <Text style={styles.goalOverlaySubtitle}>
            Вы изменили настройки профиля. Сохранить их перед выходом?
          </Text>
          <View style={styles.planOverlayButtonsRow}>
            <AppButton
              title="Не сохранять"
              onPress={async () => {
                setShowUnsavedModal(false);
                setHasUnsavedChanges(false);
                await reloadProfileAndRoadmap();
                if (pendingTab) {
                  setActiveTab(pendingTab);
                } else if (pendingNavAction) {
                  navigation.dispatch(pendingNavAction);
                } else if (pendingLogout) {
                  logout();
                }
                setPendingTab(null);
                setPendingLogout(false);
                setPendingNavAction(null);
              }}
            />
            <AppButton
              title="Сохранить"
              onPress={async () => {
                setShowUnsavedModal(false);
                await onSaveSettings();
                if (pendingTab) {
                  setActiveTab(pendingTab);
                } else if (pendingNavAction) {
                  navigation.dispatch(pendingNavAction);
                } else if (pendingLogout) {
                  logout();
                }
                setPendingTab(null);
                setPendingLogout(false);
                setPendingNavAction(null);
              }}
            />
          </View>
        </View>
      </View>
    )}

    {showGoalPicker && (
      <View style={styles.planOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={() => setShowGoalPicker(false)}
        />
        <View style={styles.goalOverlayCard}>
          <Text style={styles.goalOverlayTitle}>Выбор цели</Text>
          <Text style={styles.goalOverlaySubtitle}>Это поможет скорректировать рекомендации и план.</Text>
          {[
            { id: 'lose_weight', label: 'Похудение', description: 'Снижение веса с акцентом на дефицит калорий и активность.' },
            { id: 'gain_muscle', label: 'Набор массы', description: 'Умеренный профицит калорий и повышенный белок для роста мышц.' },
            { id: 'maintain', label: 'Поддержание', description: 'Стабильный вес и поддержание текущей формы.' },
          ].map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.goalOptionRow,
                profile.goal === option.id && styles.goalOptionRowActive,
              ]}
              activeOpacity={0.8}
              onPress={async () => {
                if (!profile) return;
                const newGoal = option.id as UserProfileApi['goal'];
                const updatedProfile: UserProfileApi = {
                  ...profile,
                  goal: newGoal,
                };
                setProfile(updatedProfile);
                setShowGoalPicker(false);
                try {
                  await updateProfile(updatedProfile);
                  // При смене цели сразу генерируем новый план через ИИ
                  await onGeneratePlan(false);
                } catch (e) {
                  console.log('Ошибка обновления цели профиля / генерации плана', e);
                }
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.goalOptionTitle}>{option.label}</Text>
                <Text style={styles.goalOptionDescription}>{option.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
          <View style={{ marginTop: 12 }}>
            <AppButton title="Закрыть" onPress={() => setShowGoalPicker(false)} />
          </View>
        </View>
      </View>
    )}

    {selectedAchievement && (
      <View style={styles.planOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={() => setSelectedAchievement(null)}
        />
        <View style={styles.achievementOverlayCard}>
          <Text style={styles.achievementOverlayTitle}>{selectedAchievement.title}</Text>
          <Text style={styles.achievementOverlayIcon}>{selectedAchievement.icon}</Text>
          <Text style={styles.achievementOverlayDescription}>{selectedAchievement.description}</Text>
          {selectedAchievement.max > 1 && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.achievementOverlayProgressLabel}>
                Прогресс: {selectedAchievement.current} / {selectedAchievement.max}{' '}
                {selectedAchievement.unit}
              </Text>
              <View style={styles.achievementProgressBarOuter}>
                <View
                  style={[
                    styles.achievementProgressBarInner,
                    {
                      width: `${Math.min(
                        (selectedAchievement.current / selectedAchievement.max) * 100,
                        100,
                      )}%`,
                    },
                  ]}
                />
              </View>
            </View>
          )}
          {selectedAchievement.unlocked && (
            <Text style={styles.achievementOverlayUnlocked}>Достижение уже разблокировано 🎉</Text>
          )}
          <View style={{ marginTop: 16 }}>
            <AppButton title="Закрыть" onPress={() => setSelectedAchievement(null)} />
          </View>
        </View>
      </View>
    )}
  </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
  },
  email: {
    color: '#6b7280',
    marginTop: 2,
  },
  goalChip: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#ecfdf5',
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalChipLabel: {
    color: '#047857',
    fontSize: 13,
    marginRight: 4,
  },
  goalChipValue: {
    color: '#047857',
    fontWeight: '600',
    fontSize: 13,
  },
  chipsRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  chip: {
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    color: '#4b5563',
    marginRight: 6,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 999,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#111827',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  statRow: {
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  progressOuter: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  progressInner: {
    height: '100%',
    borderRadius: 999,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyPeriodRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    padding: 2,
  },
  historyPeriodChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  historyPeriodChipActive: {
    backgroundColor: '#ffffff',
  },
  historyPeriodText: {
    fontSize: 12,
    color: '#6b7280',
  },
  historyPeriodTextActive: {
    color: '#111827',
    fontWeight: '600',
  },
  historyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  historyCard: {
    flexBasis: '46%',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    margin: '2%',
  },
  historyLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 4,
  },
  historyValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  historyUnit: {
    fontSize: 11,
    color: '#6b7280',
  },
  historyChartsWrapper: {
    marginTop: 16,
  },
  historyChartBox: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  historyChartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyChartTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  historyChartScroll: {
    marginTop: 4,
  },
  historyChartContainer: {
    paddingBottom: 4,
  },
  historyChartTooltipBadge: {
    backgroundColor: '#ecfdf5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyChartTooltipDate: {
    fontSize: 11,
    color: '#6b7280',
    marginRight: 6,
  },
  historyChartTooltipValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  achievementCard: {
    width: '47%',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 8,
    marginRight: '3%',
    alignItems: 'center',
  },
  achievementCardUnlocked: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#facc15',
  },
  achievementCardLocked: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    opacity: 0.7,
  },
  achievementIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  achievementTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    color: '#111827',
  },
  achievementProgressBarOuter: {
    marginTop: 6,
    height: 4,
    width: '100%',
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  achievementProgressBarInner: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#facc15',
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  formField: {
    flex: 1,
    marginRight: 8,
  },
  formFieldFull: {
    marginTop: 8,
  },
  genderSectionRow: {
    marginTop: 12,
  },
  genderCardsRow: {
    flexDirection: 'row',
    marginTop: 8,
    justifyContent: 'space-between',
  },
  genderCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    marginRight: 8,
  },
  genderCardSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#ecfdf5',
  },
  genderImageStub: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  genderImage: {
    width: '70%',
    height: '80%',
  },
  genderCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  genderLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  genderCheckBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderCheckText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  formLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  switchRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planHeaderBox: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  planGoalLabel: {
    fontSize: 12,
    color: '#9ca3af',
    textTransform: 'uppercase',
  },
  planGoalValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '700',
    color: '#f9fafb',
  },
  planTargetsText: {
    marginTop: 8,
    fontSize: 12,
    color: '#e5e7eb',
  },
  planStepsWrapper: {
    marginTop: 8,
  },
  planStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  planStepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  planStepCircleText: {
    fontWeight: '700',
    color: '#059669',
  },
  planStepCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 10,
  },
  planStepTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#111827',
  },
  planStepDescription: {
    fontSize: 13,
    color: '#4b5563',
  },
  planFooterRow: {
    marginTop: 8,
  },
  planFooterText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  planEmptyBox: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  planEmptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    color: '#111827',
  },
  planEmptyText: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 12,
  },
  planPendingBox: {
    paddingVertical: 12,
  },
  planPendingTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
    color: '#111827',
  },
  planPendingText: {
    fontSize: 13,
    color: '#4b5563',
    textAlign: 'center',
  },
  planOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  planOverlayCard: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#ffffff',
    padding: 16,
  },
  planOverlayTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  planOverlayText: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 12,
  },
  planOverlayInput: {
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  planOverlayButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  goalOverlayCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  goalOverlayTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
    color: '#111827',
    textAlign: 'center',
  },
  goalOverlaySubtitle: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 14,
    textAlign: 'center',
  },
  goalOptionRow: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: '#f3f4f6',
  },
  goalOptionRowActive: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#34d399',
  },
  goalOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  goalOptionDescription: {
    fontSize: 13,
    color: '#4b5563',
  },
  achievementOverlayCard: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#ffffff',
    padding: 20,
  },
  achievementOverlayTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  achievementOverlayIcon: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 8,
  },
  achievementOverlayDescription: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
  },
  achievementOverlayProgressLabel: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 4,
  },
  achievementOverlayUnlocked: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    color: '#16a34a',
    textAlign: 'center',
  },
});
