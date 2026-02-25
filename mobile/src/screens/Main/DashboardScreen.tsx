import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Image, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSteps } from '../../hooks/useSteps';
import { useTodayStats } from '../../hooks/useTodayStats';
import { useNotificationsSetup, scheduleWaterReminder, cancelWaterReminders } from '../../hooks/useNotifications';
import { useFoodToday } from '../../hooks/useFoodToday';
import { MainStackParamList } from '../../navigation/MainStack';
import { useAuth } from '../../context/AuthContext';
import { getProfile, getSettings, SettingsApi, UserProfileApi, updateStepsToday } from '../../api/me';
import { ProgressRing } from '../../components/ProgressRing';
import { ProgressBar } from '../../components/ProgressBar';
import { useTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../constants/Theme';
import { NutritionStatusCard } from '../../features/dashboard/components/NutritionStatusCard';
import { WaterAndSleepRow } from '../../features/dashboard/components/WaterAndSleepRow';
import { ActivityCard } from '../../features/dashboard/components/ActivityCard';
import { MainFoodLog, FoodFilterType } from '../../features/dashboard/components/MainFoodLog';

type Nav = NativeStackNavigationProp<MainStackParamList, 'Tabs'>;

export const DashboardScreen: React.FC = () => {
  useNotificationsSetup();
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { theme, mode, toggleTheme } = useTheme(); // Added toggleTheme for demo/testing
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { steps } = useSteps(true);
  const { stats, loading, addWater, setStats } = useTodayStats();
  const { items: foodItems, loading: foodLoading, load: loadFood } = useFoodToday();
  const [foodFilterType, setFoodFilterType] = useState<FoodFilterType>('today');
  const [foodDateRange, setFoodDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

  const [profile, setProfile] = useState<UserProfileApi | null>(null);
  const [settings, setSettings] = useState<SettingsApi | null>(null);
  const [showConsumed, setShowConsumed] = useState(false);
  const [waterRemindersEnabled, setWaterRemindersEnabled] = useState(false);

  const loadProfileAndSettings = React.useCallback(async () => {
    try {
      const [p, s, waterFlag] = await Promise.all([
        getProfile(),
        getSettings(),
        AsyncStorage.getItem('waterRemindersEnabled'),
      ]);
      setProfile(p.data);
      setSettings(s.data);
      if (waterFlag === 'true') setWaterRemindersEnabled(true);
    } catch (e) {
      console.log('Ошибка загрузки профиля/настроек для Dashboard', e);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadFood();
      loadProfileAndSettings();
    }, [loadFood, loadProfileAndSettings]),
  );

  useEffect(() => {
    loadProfileAndSettings();
  }, [loadProfileAndSettings]);

  const onToggleWaterReminders = async () => {
    try {
      const next = !waterRemindersEnabled;
      if (next) {
        await scheduleWaterReminder(120);
      } else {
        await cancelWaterReminders();
      }
      setWaterRemindersEnabled(next);
      await AsyncStorage.setItem('waterRemindersEnabled', next ? 'true' : 'false');
    } catch (e) {
      console.log('Ошибка переключения напоминаний воды', e);
    }
  };

  // Macros
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const todayFoodItems = useMemo(() => {
    return foodItems.filter((f) => {
      const ts = typeof f.timestamp === 'number' ? f.timestamp : new Date(f.timestamp).getTime();
      return ts >= todayStart;
    });
  }, [foodItems, todayStart]);

  const totalProtein = todayFoodItems.reduce((sum, f) => sum + (f.protein || 0), 0);
  const totalFat = todayFoodItems.reduce((sum, f) => sum + (f.fat || 0), 0);
  const totalCarbs = todayFoodItems.reduce((sum, f) => sum + (f.carbs || 0), 0);
  const totalCaloriesFromFood = todayFoodItems.reduce((sum, f) => sum + (f.calories || 0), 0);

  const calorieGoal = profile?.dailyCalorieGoal || 2000;
  const caloriesConsumedToday = Math.round(stats.calories || totalCaloriesFromFood);
  const burnedCalories = 0;
  const caloriesLeftToday = Math.max(0, calorieGoal - caloriesConsumedToday + burnedCalories);

  const macroGoals = useMemo(() => {
    const cals = calorieGoal;
    let ratio = { p: 0.25, f: 0.25, c: 0.5 };

    if (profile?.goal === 'lose_weight') {
      ratio = { p: 0.4, f: 0.3, c: 0.3 };
    } else if (profile?.goal === 'gain_muscle') {
      ratio = { p: 0.3, f: 0.2, c: 0.5 };
    }

    return {
      protein: Math.round((cals * ratio.p) / 4),
      fat: Math.round((cals * ratio.f) / 9),
      carbs: Math.round((cals * ratio.c) / 4),
    };
  }, [calorieGoal, profile?.goal]);

  const filteredFoodEntries = useMemo(() => {
    const base = [...foodItems];
    const todayStartMs = todayStart;

    const parseDateStr = (value: string) => {
      if (!value) return null;
      const [y, m, d] = value.split('-').map(Number);
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d).getTime();
    };

    return base
      .filter((entry) => {
        const entryTime = typeof entry.timestamp === 'number' ? entry.timestamp : new Date(entry.timestamp).getTime();

        if (foodFilterType === 'today') {
          return entryTime >= todayStartMs;
        }
        if (foodFilterType === 'week') {
          const weekStart = todayStartMs - 6 * 24 * 60 * 60 * 1000;
          return entryTime >= weekStart;
        }
        if (foodFilterType === 'custom') {
          if (!foodDateRange.start || !foodDateRange.end) return true;
          const start = parseDateStr(foodDateRange.start);
          const endBase = parseDateStr(foodDateRange.end);
          if (!start || !endBase) return true;
          const end = new Date(endBase);
          end.setHours(23, 59, 59, 999);
          const endMs = end.getTime();
          return entryTime >= start && entryTime <= endMs;
        }
        return true;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [foodItems, foodFilterType, foodDateRange, todayStart]);

  const ringProgress = calorieGoal > 0 ? Math.min(caloriesConsumedToday / calorieGoal, 1) : 0;

  const onSyncSteps = async () => {
    try {
      await updateStepsToday(steps);
      setStats((prev) => ({ ...prev, steps }));
    } catch (e) {
      console.log('Ошибка синхронизации шагов', e);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accentNutrition} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <TouchableOpacity onPress={toggleTheme}>
              <Text style={styles.greeting}>СИСТЕМА В СЕТИ ({mode.toUpperCase()})</Text>
            </TouchableOpacity>
            <Text style={styles.greetingSub}>{user?.name || 'ПОЛЬЗОВАТЕЛЬ'} // ID: {user?.id?.slice(0, 6) || 'N/A'}</Text>
          </View>
          <TouchableOpacity
            style={[styles.avatarCircle, profile?.avatarUri && { backgroundColor: 'transparent', borderWidth: 0 }]}
            activeOpacity={0.8}
            onPress={() => (navigation as any).navigate('Profile')}
          >
            {profile?.avatarUri ? (
              <Image
                source={{ uri: profile.avatarUri }}
                style={{ width: 40, height: 40, borderRadius: 20 }}
              />
            ) : (
              <Text style={styles.avatarText}>
                {profile?.avatarEmoji || (user?.name || 'N')[0]?.toUpperCase()}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* --- MAIN DASHBOARD (NUTRITION) --- */}
        <NutritionStatusCard
          calorieGoal={calorieGoal}
          caloriesConsumedToday={caloriesConsumedToday}
          caloriesLeftToday={caloriesLeftToday}
          ringProgress={ringProgress}
          showConsumed={showConsumed}
          setShowConsumed={setShowConsumed}
          totalProtein={totalProtein}
          totalFat={totalFat}
          totalCarbs={totalCarbs}
          macroGoals={macroGoals}
        />

        {/* --- WATER & SLEEP --- */}
        <WaterAndSleepRow
          stats={stats}
          settings={settings}
          waterRemindersEnabled={waterRemindersEnabled}
          onToggleWaterReminders={onToggleWaterReminders}
          addWater={addWater}
          onManageSleep={() => navigation.navigate('Sleep')}
        />

        {/* --- ACTIVITY --- */}
        <ActivityCard
          steps={steps}
          dailyStepGoal={profile?.dailyStepGoal ?? 10000}
          onAddActivity={() => (navigation as any).navigate('ActivityLogger')}
          onSyncSteps={onSyncSteps}
        />

        {/* --- FOOD LOG BUTTON --- */}
        <View style={{ marginVertical: 8 }}>
          <AppButton
            title="ДОБАВИТЬ ПРИЕМ ПИЩИ"
            onPress={() => navigation.navigate('FoodLogger')}
            variant="primary"
          />
        </View>

        {/* --- HISTORY --- */}
        <MainFoodLog
          foodLoading={foodLoading}
          filteredFoodEntries={filteredFoodEntries}
          foodFilterType={foodFilterType}
          setFoodFilterType={setFoodFilterType}
        />
      </ScrollView>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  greeting: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.accentNutrition,
    letterSpacing: 2,
    marginBottom: 4,
  },
  greetingSub: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: 'monospace',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  avatarText: {
    fontWeight: '700',
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  // Card styles
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.effects.shadow,
  },
  cardEmphasis: {
    backgroundColor: theme.mode === 'dark' ? 'rgba(5, 8, 7, 0.8)' : theme.colors.surface,
    borderRadius: 32,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.accentNutrition,
    shadowColor: theme.colors.accentNutrition,
    shadowOpacity: theme.mode === 'dark' ? 0.15 : 0.05,
    shadowRadius: 10,
    elevation: 5,
  },
  cardSmall: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.effects.shadow,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardTitleSmall: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderRowAlt: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitleRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  // Ring
  ringAndTextRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  ringWrapper: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringCalories: {
    fontSize: 36,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textShadowColor: theme.effects.glow ? theme.colors.accentNutrition : 'transparent',
    textShadowRadius: 10,
  },
  ringLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    letterSpacing: 1,
    marginTop: 4,
  },
  // Macros
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  macroCol: {
    flex: 1,
  },
  macroLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    marginBottom: 6,
    fontWeight: '600',
  },
  macroGoalText: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  // Stats
  statValueBig: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '400',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  miniButton: {
    backgroundColor: theme.colors.surfaceAlt,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  miniButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  sleepManageButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: theme.mode === 'dark' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)',
    borderRadius: 12,
  },
  sleepManageText: {
    color: theme.colors.accentSleep,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  // Activity
  trainingButtonWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  trainingButton: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainingButtonText: {
    color: '#000', // Always dark text on orange gradient preferred? Or white?
    // Spec says "button.primary.background = accent color". 
    // Here it's a gradient. Let's keep it legible.
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  syncButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: 'transparent',
  },
  syncButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },

  // History
  filterRowSmall: {
    flexDirection: 'row',
    marginBottom: 16,
    marginTop: 8,
    gap: 8,
  },
  filterChipSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipSmallActive: {
    backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    borderColor: theme.colors.accentNutrition,
  },
  filterChipSmallText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  filterChipSmallTextActive: {
    color: theme.colors.accentNutrition,
    fontWeight: '700',
  },
  noMealsText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 12,
  },
  mealRow: {
    marginBottom: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 12,
  },
  mealRowInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealName: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  mealMeta: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  mealCalories: {
    color: theme.colors.accentNutrition,
    fontWeight: '700',
    fontSize: 14,
  },
  // Modal
  foodModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    padding: 24,
  },
  foodModalCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    elevation: 10,
  },
  foodModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  foodModalCaloriesText: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.accentNutrition,
    marginBottom: 16,
  },
});
