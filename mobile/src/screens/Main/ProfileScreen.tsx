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
  Modal,
  Platform,
  Alert,
  ActionSheetIOS,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../constants/Theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppButton } from '../../components/AppButton';
import { ProfileStatsTab, AchievementMobile } from '../../features/profile/components/ProfileStatsTab';
import { ProfilePlanTab } from '../../features/profile/components/ProfilePlanTab';
import { ProfileSettingsTab } from '../../features/profile/components/ProfileSettingsTab';
import { GoalPickerModal } from '../../features/profile/components/GoalPickerModal';
import { AvatarPickerModal } from '../../features/profile/components/AvatarPickerModal';
import { AchievementModal } from '../../features/profile/components/AchievementModal';
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
type HistoryPeriod = 'week' | 'month';
import { ProgressBar } from '../../components/ProgressBar';
import { DailyMetricsCard } from '../../components/DailyMetricsCard';
import { DailyMetricsList, DailyMetricData } from '../../components/DailyMetricsList';

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

  const { theme, mode, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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
  const [showAvatarModal, setShowAvatarModal] = useState(false);

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

  // Синхронизация состояния напоминаний о воде при фокусе экрана
  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        try {
          const waterFlag = await AsyncStorage.getItem('waterRemindersEnabled');
          setWaterRemindersEnabled(waterFlag === 'true');
        } catch (e) {
          console.log('Ошибка синхронизации состояния напоминаний о воде', e);
        }
      })();
    }, []),
  );

  const onSaveSettings = async () => {
    if (!profile || !settings) return;
    setSaving(true);
    try {
      await Promise.all([
        updateProfile(profile),
        updateSettings(settings),
      ]);
      setHasUnsavedChanges(false);
      // План больше не пересчитываем автоматически при любом изменении настроек,
      // чтобы изменения будильников и напоминаний не трогали "Мой план".
      // Обновление плана остаётся через экран "Мой план" и явные действия пользователя.
    } catch (e) {
      console.log('Ошибка сохранения профиля/настроек', e);
    } finally {
      setSaving(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Ошибка', 'Нужен доступ к галерее для смены фото');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        const manipResult = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 512, height: 512 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );

        if (manipResult.base64) {
          const base64Img = `data:image/jpeg;base64,${manipResult.base64}`;

          // Optimistically update UI
          if (profile) {
            setProfile({ ...profile, avatarUri: base64Img });
          }

          // Save to backend immediately
          await updateProfile({ avatarUri: base64Img });
        }
      }
    } catch (e) {
      console.log('Error picking image', e);
      Alert.alert('Ошибка', 'Не удалось загрузить изображение');
    }
  };

  const removeAvatar = async () => {
    if (!profile) return;

    // Optimistically update
    setProfile({ ...profile, avatarUri: undefined });

    // Save to backend
    // Sending empty string to clear the field on server
    await updateProfile({ avatarUri: '' } as any);
  };

  const handleAvatarPress = () => {
    setShowAvatarModal(true);
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
          <TouchableOpacity
            style={[styles.avatarCircle, profile.avatarUri && { backgroundColor: 'transparent', borderWidth: 0 }]}
            activeOpacity={0.8}
            onPress={handleAvatarPress}
          >
            {profile.avatarUri ? (
              <Image
                source={{ uri: profile.avatarUri }}
                style={{ width: 64, height: 64, borderRadius: 32 }}
              />
            ) : (
              <Text style={styles.avatarText}>
                {profile.avatarEmoji || (profile.name || user?.name || 'N')[0]?.toUpperCase()}
              </Text>
            )}
          </TouchableOpacity>
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

        {activeTab === 'stats' && (
          <ProfileStatsTab
            theme={theme}
            profile={profile}
            todayStats={todayStats}
            waterGoal={waterGoal}
            historyPeriod={historyPeriod}
            setHistoryPeriod={setHistoryPeriod}
            historyLoading={historyLoading}
            historyAverages={historyAverages}
            filteredHistory={filteredHistory}
            selectedCalorieIndex={selectedCalorieIndex}
            setSelectedCalorieIndex={setSelectedCalorieIndex}
            selectedStepsIndex={selectedStepsIndex}
            setSelectedStepsIndex={setSelectedStepsIndex}
            achievements={achievements}
            setSelectedAchievement={setSelectedAchievement}
            formatShortDate={formatShortDate}
            styles={styles}
          />
        )}

        {activeTab === 'plan' && (
          <ProfilePlanTab
            profile={profile}
            generatingPlan={generatingPlan}
            loadingRoadmap={loadingRoadmap}
            roadmap={roadmap}
            translateGoal={translateGoal}
            setIsAdjustingPlan={setIsAdjustingPlan}
            onGeneratePlan={onGeneratePlan}
            styles={styles}
          />
        )}

        {activeTab === 'settings' && (
          <ProfileSettingsTab
            profile={profile}
            setProfile={setProfile}
            settings={settings}
            setSettings={setSettings}
            setHasUnsavedChanges={setHasUnsavedChanges}
            mode={mode}
            theme={theme}
            toggleTheme={toggleTheme}
            waterRemindersEnabled={waterRemindersEnabled}
            setWaterRemindersEnabled={setWaterRemindersEnabled}
            scheduleOrCancelSleep={scheduleOrCancelSleep}
            scheduleWaterReminder={scheduleWaterReminder}
            cancelWaterReminders={cancelWaterReminders}
            saving={saving}
            onSaveSettings={onSaveSettings}
            styles={styles}
          />
        )}

        <View style={{ marginTop: 16 }}>
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
      )
      }

      {
        showUnsavedModal && (
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
        )
      }

      <GoalPickerModal
        visible={showGoalPicker}
        onClose={() => setShowGoalPicker(false)}
        profile={profile}
        onSelectGoal={async (goalId) => {
          if (!profile) return;
          const updatedProfile: UserProfileApi = {
            ...profile,
            goal: goalId as UserProfileApi['goal'],
          };
          setProfile(updatedProfile);
          setShowGoalPicker(false);
          try {
            await updateProfile(updatedProfile);
            await onGeneratePlan(false);
          } catch (e) {
            console.log('Ошибка обновления цели профиля / генерации плана', e);
          }
        }}
        styles={styles}
      />

      <AvatarPickerModal
        visible={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        profile={profile}
        onPickImage={() => { pickImage(); setShowAvatarModal(false); }}
        onRemoveAvatar={() => { removeAvatar(); setShowAvatarModal(false); }}
        onSelectEmoji={async (emoji) => {
          const updated = { ...profile, avatarEmoji: emoji, avatarUri: undefined };
          setProfile(updated as any);
          updateProfile({ avatarEmoji: emoji, avatarUri: '' } as any).catch(e => console.log(e));
          setShowAvatarModal(false);
        }}
        theme={theme}
        styles={styles}
      />

      <AchievementModal
        achievement={selectedAchievement}
        onClose={() => setSelectedAchievement(null)}
        styles={styles}
      />
    </SafeAreaView>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: theme.colors.accentNutrition,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: theme.colors.accentNutrition,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.accentNutrition,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  email: {
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  goalChip: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  goalChipLabel: {
    color: theme.colors.accentNutrition,
    fontSize: 13,
    marginRight: 4,
  },
  goalChipValue: {
    color: theme.colors.accentNutrition,
    fontWeight: '600',
    fontSize: 13,
  },
  chipsRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  chip: {
    backgroundColor: theme.colors.surface,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginRight: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 999,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: theme.colors.background,
    shadowColor: theme.colors.accentNutrition,
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.accentNutrition,
    fontWeight: '700',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.mode === 'dark' ? theme.colors.accentNutrition : '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: theme.colors.textPrimary,
  },
  statRow: {
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: theme.colors.textPrimary,
  },
  progressOuter: {
    height: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceAlt,
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
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 999,
    padding: 2,
  },
  historyPeriodChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  historyPeriodChipActive: {
    backgroundColor: theme.colors.surface,
  },
  historyPeriodText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  historyPeriodTextActive: {
    color: theme.colors.textPrimary,
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
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  historyLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  historyValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  historyUnit: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  historyChartsWrapper: {
    marginTop: 16,
  },
  historyChartBox: {
    marginTop: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    color: theme.colors.textPrimary,
  },
  historyChartScroll: {
    marginTop: 4,
  },
  historyChartContainer: {
    paddingBottom: 4,
  },
  historyChartTooltipBadge: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.mode === 'dark' ? theme.colors.accentNutrition : '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  historyChartTooltipDate: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginRight: 6,
  },
  historyChartTooltipValue: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.accentNutrition,
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
    backgroundColor: theme.colors.surface,
  },
  achievementCardUnlocked: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: theme.colors.accentNutrition,
  },
  achievementCardLocked: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    color: theme.colors.textPrimary,
  },
  achievementProgressBarOuter: {
    marginTop: 6,
    height: 4,
    width: '100%',
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceAlt,
    overflow: 'hidden',
  },
  achievementProgressBarInner: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: theme.colors.accentNutrition,
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
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
    marginRight: 8,
  },
  genderCardSelected: {
    borderColor: theme.colors.accentNutrition,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  genderImageStub: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
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
    color: theme.colors.textPrimary,
  },
  genderCheckBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.accentNutrition,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderCheckText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  formLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.background,
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
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  planGoalLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  planGoalValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  planTargetsText: {
    marginTop: 8,
    fontSize: 12,
    color: theme.colors.textSecondary,
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
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  planStepCircleText: {
    fontWeight: '700',
    color: theme.colors.accentNutrition,
  },
  planStepCard: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  planStepTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: theme.colors.textPrimary,
  },
  planStepDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  planFooterRow: {
    marginTop: 8,
  },
  planFooterText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  planEmptyBox: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  planEmptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    color: theme.colors.textPrimary,
  },
  planEmptyText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
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
    color: theme.colors.textPrimary,
  },
  planPendingText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  planOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  planOverlayCard: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  planOverlayTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: theme.colors.textPrimary,
  },
  planOverlayText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  planOverlayInput: {
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 12,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 10,
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
    backgroundColor: theme.colors.surface,
    padding: 20,
    elevation: 4,
    shadowColor: theme.mode === 'dark' ? theme.colors.accentNutrition : '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  goalOverlayTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  goalOverlaySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 14,
    textAlign: 'center',
  },
  goalOptionRow: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  goalOptionRowActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 2,
    borderColor: theme.colors.accentNutrition,
  },
  goalOptionLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  goalOptionDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  achievementOverlayCard: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  achievementOverlayTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
    color: theme.colors.textPrimary,
  },
  achievementOverlayIcon: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 8,
  },
  achievementOverlayDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  achievementOverlayProgressLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  achievementOverlayUnlocked: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.accentNutrition,
    textAlign: 'center',
  },
});
