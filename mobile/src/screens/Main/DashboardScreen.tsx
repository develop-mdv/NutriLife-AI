import React, { useEffect, useMemo, useState } from 'react';
import { Colors } from '../../constants/Colors';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Image, TouchableOpacity } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SvgProps } from 'react-native-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSteps } from '../../hooks/useSteps';
import { useTodayStats } from '../../hooks/useTodayStats';
import { useNotificationsSetup, scheduleWaterReminder, cancelWaterReminders } from '../../hooks/useNotifications';
import { useFoodToday } from '../../hooks/useFoodToday';
import { MainStackParamList } from '../../navigation/MainStack';
import { useAuth } from '../../context/AuthContext';
import { getProfile, getSettings, SettingsApi, UserProfileApi, updateStepsToday } from '../../api/me';
import { ProgressRing } from '../../components/ProgressRing';
import { ProgressBar } from '../../components/ProgressBar';

type Nav = NativeStackNavigationProp<MainStackParamList, 'Tabs'>;

type FoodFilterType = 'today' | 'week' | 'custom';



export const DashboardScreen: React.FC = () => {
  useNotificationsSetup();
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { steps } = useSteps(true);
  const { stats, loading, addWater, setStats } = useTodayStats();
  const { items: foodItems, loading: foodLoading, load: loadFood } = useFoodToday();
  const [foodFilterType, setFoodFilterType] = useState<FoodFilterType>('today');
  const [foodDateRange, setFoodDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [selectedFood, setSelectedFood] = useState<(typeof foodItems)[number] | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
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
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>СИСТЕМА В СЕТИ</Text>
            <Text style={styles.greetingSub}>{user?.name || 'ПОЛЬЗОВАТЕЛЬ'} // ID: {user?.id?.slice(0, 6) || 'N/A'}</Text>
          </View>
          <TouchableOpacity
            style={styles.avatarCircle}
            activeOpacity={0.8}
            onPress={() => (navigation as any).navigate('Profile')}
          >
            <Text style={styles.avatarText}>
              {(user?.name || 'N')[0]?.toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* --- MAIN DASHBOARD (NUTRITION) --- */}
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
                color={Colors.primary}
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
            {/* Protein */}
            <View style={styles.macroCol}>
              <Text style={[styles.macroLabel, { color: Colors.protein }]}>БЕЛКИ</Text>
              <Text style={styles.macroValue}>
                {Math.round(totalProtein)}
                <Text style={styles.macroGoalText}>/{macroGoals.protein}g</Text>
              </Text>
              <ProgressBar current={totalProtein} max={macroGoals.protein} color={Colors.protein} />
            </View>

            {/* Fat */}
            <View style={styles.macroCol}>
              <Text style={[styles.macroLabel, { color: Colors.fat }]}>ЖИРЫ</Text>
              <Text style={styles.macroValue}>
                {Math.round(totalFat)}
                <Text style={styles.macroGoalText}>/{macroGoals.fat}g</Text>
              </Text>
              <ProgressBar current={totalFat} max={macroGoals.fat} color={Colors.fat} />
            </View>

            {/* Carbs */}
            <View style={styles.macroCol}>
              <Text style={[styles.macroLabel, { color: Colors.carbs }]}>УГЛЕВОДЫ</Text>
              <Text style={styles.macroValue}>
                {Math.round(totalCarbs)}
                <Text style={styles.macroGoalText}>/{macroGoals.carbs}g</Text>
              </Text>
              <ProgressBar current={totalCarbs} max={macroGoals.carbs} color={Colors.carbs} />
            </View>
          </View>
        </View>

        {/* --- WATER & SLEEP --- */}
        <View style={styles.rowBetween}>
          {/* Water Card */}
          <View style={[styles.cardSmall, { flex: 1, marginRight: 8 }]}>
            <View style={styles.cardHeaderRowAlt}>
              <View style={styles.cardTitleRowLeft}>
                <Text style={styles.cardTitleSmall}>ГИДРАТАЦИЯ</Text>
              </View>
              <TouchableOpacity onPress={onToggleWaterReminders}>
                <Text style={{ fontSize: 18 }}>{waterRemindersEnabled ? '🔔' : '🔕'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.statValueBig}>{stats.water}
              <Text style={styles.statLabel}> / {(settings?.waterGoal ?? 2000)} ml</Text>
            </Text>
            <View style={{ marginVertical: 8 }}>
              <ProgressBar
                current={stats.water}
                max={settings?.waterGoal ?? 2000}
                color={Colors.info}
              />
            </View>
            <View style={styles.row}>
              <TouchableOpacity style={styles.miniButton} onPress={() => addWater(250)}>
                <Text style={styles.miniButtonText}>+250</Text>
              </TouchableOpacity>
              <View style={{ width: 8 }} />
              <TouchableOpacity style={styles.miniButton} onPress={() => addWater(500)}>
                <Text style={styles.miniButtonText}>+500</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sleep Card */}
          <View style={[styles.cardSmall, { flex: 1, marginLeft: 8 }]}>
            <View style={styles.cardHeaderRowAlt}>
              <Text style={styles.cardTitleSmall}>ВОССТАНОВЛЕНИЕ</Text>
              {settings?.sleep.wakeAlarmEnabled && <Text style={{ color: Colors.accent }}>⏰ {settings.sleep.wakeTime}</Text>}
            </View>
            <Text style={styles.statValueBig}>
              {stats.sleepHours}
              <Text style={styles.statLabel}> / {settings?.sleep.targetHours ?? 8} hr</Text>
            </Text>
            <View style={{ marginVertical: 8 }}>
              <ProgressBar
                current={stats.sleepHours}
                max={settings?.sleep.targetHours ?? 8}
                color={Colors.accent}
              />
            </View>
            <TouchableOpacity
              style={styles.sleepManageButton}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Sleep')}
            >
              <Text style={styles.sleepManageText}>Управление сном</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* --- ACTIVITY --- */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRowAlt}>
            <Text style={styles.cardTitleSmall}>АКТИВНОСТЬ</Text>
            <Text style={styles.smallText}>{steps} / {(profile?.dailyStepGoal ?? 10000)}</Text>
          </View>
          <View style={{ marginBottom: 16 }}>
            <ProgressBar
              current={steps}
              max={profile?.dailyStepGoal ?? 10000}
              color={Colors.secondary}
            />
          </View>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.trainingButtonWrapper, { flex: 1 }]}
              activeOpacity={0.9}
              onPress={() => (navigation as any).navigate('ActivityLogger')}
            >
              <LinearGradient
                colors={[Colors.secondary, '#FB923C']} // Orange gradient
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

        {/* --- FOOD LOG BUTTON --- */}
        <View style={{ marginVertical: 8 }}>
          <AppButton
            title="ДОБАВИТЬ ПРИЕМ ПИЩИ"
            onPress={() => navigation.navigate('FoodLogger')}
            variant="primary"
          />
        </View>

        {/* --- HISTORY --- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>DATA LOGS</Text>
          <View style={styles.filterRowSmall}>
            {/* Simple filter tabs implementation */}
            {(
              [
                { key: 'today', label: '24H' },
                { key: 'week', label: '7D' },
                { key: 'custom', label: '···' },
              ] as { key: FoodFilterType; label: string }[]
            ).map((f) => (
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
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
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

      </ScrollView>

      {/* MODAL (Simplified for Glassmorphism) */}
      {selectedFood && (
        <View style={styles.foodModalOverlay}>
          <View style={styles.foodModalCard}>
            <Text style={styles.foodModalTitle}>{selectedFood.name}</Text>
            <Text style={styles.foodModalCaloriesText}>{Math.round(selectedFood.calories)} KCAL</Text>
            <Text style={{ color: Colors.textSecondary, marginBottom: 20 }}>
              P: {Math.round(selectedFood.protein)} / F: {Math.round(selectedFood.fat)} / C: {Math.round(selectedFood.carbs)}
            </Text>
            <AppButton title="CLOSE" onPress={() => setSelectedFood(null)} variant="secondary" />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
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
    color: Colors.primary,
    letterSpacing: 2,
    marginBottom: 4,
  },
  greetingSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'monospace', // Tech look
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarText: {
    fontWeight: '700',
    fontSize: 16,
    color: Colors.textPrimary,
  },
  // Card styles
  card: {
    backgroundColor: Colors.card, // Glass
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardEmphasis: {
    backgroundColor: 'rgba(5, 8, 7, 0.8)', // Darker
    borderRadius: 32,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.primary, // Neon border
    shadowColor: Colors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  cardSmall: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardTitleSmall: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textDim,
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
    color: Colors.textSecondary,
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
    color: Colors.textPrimary,
    textShadowColor: Colors.primary,
    textShadowRadius: 10,
  },
  ringLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
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
    color: Colors.textPrimary,
    marginBottom: 6,
    fontWeight: '600',
  },
  macroGoalText: {
    fontSize: 10,
    color: Colors.textDim,
  },
  // Progress Bar
  progressOuter: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressInner: {
    height: '100%',
    borderRadius: 2,
  },
  // Stats
  statValueBig: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textDim,
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  miniButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  sleepManageButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
  },
  sleepManageText: {
    color: Colors.accent,
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
    color: '#000',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  syncButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
  },
  syncButtonText: {
    color: Colors.textSecondary,
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipSmallActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: Colors.primary,
  },
  filterChipSmallText: {
    fontSize: 11,
    color: Colors.textDim,
  },
  filterChipSmallTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  noMealsText: {
    color: Colors.textDim,
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 12,
  },
  mealRow: {
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    padding: 12,
  },
  mealRowInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  mealMeta: {
    color: Colors.textDim,
    fontSize: 11,
    marginTop: 2,
  },
  mealCalories: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  // Modal
  foodModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    padding: 24,
  },
  foodModalCard: {
    backgroundColor: '#0F1311', // Almost black
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  foodModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  foodModalCaloriesText: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 16,
  },
});
