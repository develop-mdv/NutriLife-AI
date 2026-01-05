import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Image, TouchableOpacity } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Circle } from 'react-native-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSteps } from '../../hooks/useSteps';
import { useTodayStats } from '../../hooks/useTodayStats';
import { useNotificationsSetup, scheduleWaterReminder, cancelWaterReminders } from '../../hooks/useNotifications';
import { useFoodToday } from '../../hooks/useFoodToday';
import { MainStackParamList } from '../../navigation/MainStack';
import { useAuth } from '../../context/AuthContext';
import { getProfile, getSettings, SettingsApi, UserProfileApi, updateStepsToday } from '../../api/me';

type Nav = NativeStackNavigationProp<MainStackParamList, 'Tabs'>;

type FoodFilterType = 'today' | 'week' | 'custom';

const ProgressBar: React.FC<{ current: number; max: number; color: string }> = ({ current, max, color }) => {
  const ratio = max > 0 ? Math.min(current / max, 1) : 0;
  return (
    <View style={styles.progressOuter}>
      <View style={[styles.progressInner, { width: `${ratio * 100}%`, backgroundColor: color }]} />
    </View>
  );
};

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

  const onEnableWaterReminders = async () => {
    await scheduleWaterReminder(120); // legacy helper, оставлен для совместимости, но основное управление через onToggleWaterReminders
  };

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

  // агрегированные макросы за сегодня (считаем по временной метке)
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
  const burnedCalories = 0; // TODO: когда появятся тренировки/активность, можно учесть сожжённые калории
  const caloriesLeftToday = Math.max(0, calorieGoal - caloriesConsumedToday + burnedCalories);

  const macroGoals = useMemo(() => {
    const cals = calorieGoal;
    let ratio = { p: 0.25, f: 0.25, c: 0.5 } as const;

    if (profile?.goal === 'lose_weight') {
      ratio = { p: 0.4, f: 0.3, c: 0.3 } as const;
    } else if (profile?.goal === 'gain_muscle') {
      ratio = { p: 0.3, f: 0.2, c: 0.5 } as const;
    }

    return {
      protein: Math.round((cals * ratio.p) / 4),
      fat: Math.round((cals * ratio.f) / 9),
      carbs: Math.round((cals * ratio.c) / 4),
    };
  }, [calorieGoal, profile?.goal]);

  // фильтрация истории питания по периоду (Сегодня / 7 дней / Период)
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

  // кольцо калорий: прогресс по сегодняшним калориям относительно цели профиля
  const RING_SIZE = 140;
  const STROKE_WIDTH = 14;
  const radius = (RING_SIZE - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const ringProgress = calorieGoal > 0 ? Math.min(caloriesConsumedToday / calorieGoal, 1) : 0;
  const strokeDashoffset = circumference - circumference * ringProgress;

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
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Header, как в веб-версии */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>Привет, {user?.name || 'друг'} 👋</Text>
          <Text style={styles.greetingSub}>Давай достигнем целей сегодня!</Text>
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

      {/* Кольцо калорий и макросы как на веб-дашборде */}
      <View style={styles.cardEmphasis}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Сегодня</Text>
          <Text style={styles.smallText}>Цель: {calorieGoal} ккал</Text>
        </View>

        <View style={styles.ringAndTextRow}>
          <TouchableOpacity
            style={styles.ringWrapper}
            activeOpacity={0.8}
            onPress={() => setShowConsumed((prev) => !prev)}
          >
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={radius}
                stroke="#e5e7eb"
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={radius}
                stroke="#34D399"
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                rotation={-90}
                originX={RING_SIZE / 2}
                originY={RING_SIZE / 2}
              />
            </Svg>
            <View style={styles.ringInner}>
              <Text style={styles.ringCalories}>
                {showConsumed ? caloriesConsumedToday : caloriesLeftToday}
              </Text>
              <Text style={styles.ringLabel}>
                {showConsumed ? 'ккал съедено' : 'ккал ост.'}
              </Text>
              {showConsumed && (
                <Text style={styles.ringLabelSmall}>из {calorieGoal} ккал</Text>
              )}
              {!showConsumed && burnedCalories > 0 && (
                <Text style={styles.ringBurned}>+{burnedCalories} сожжено</Text>
              )}
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.macrosRow}>
          <View style={styles.macroCol}>
            <Text style={[styles.macroDot, { backgroundColor: '#34D399' }]} />
            <Text style={styles.macroLabel}>Белки</Text>
            <Text style={styles.macroValue}>
              {Math.round(totalProtein)} г
              <Text style={styles.macroGoalText}> / {macroGoals.protein} г</Text>
            </Text>
          </View>
          <View style={styles.macroCol}>
            <Text style={[styles.macroDot, { backgroundColor: '#FBBF24' }]} />
            <Text style={styles.macroLabel}>Жиры</Text>
            <Text style={styles.macroValue}>
              {Math.round(totalFat)} г
              <Text style={styles.macroGoalText}> / {macroGoals.fat} г</Text>
            </Text>
          </View>
          <View style={styles.macroCol}>
            <Text style={[styles.macroDot, { backgroundColor: '#60A5FA' }]} />
            <Text style={styles.macroLabel}>Углеводы</Text>
            <Text style={styles.macroValue}>
              {Math.round(totalCarbs)} г
              <Text style={styles.macroGoalText}> / {macroGoals.carbs} г</Text>
            </Text>
          </View>
        </View>

        <Text style={styles.macroFooter}>
          Макросы за сегодня. Всего из еды: {Math.round(totalCaloriesFromFood)} ккал
        </Text>
      </View>

      {/* Вода и сон в одну строку, как две карточки */}
      <View style={styles.rowBetween}>
        <View style={[styles.cardSmall, { flex: 1, marginRight: 8 }] }>
          <View style={styles.cardHeaderRowAlt}>
            <View style={styles.cardTitleRowLeft}>
              <View style={[styles.iconCircle, styles.iconWater]}>
                <Text style={styles.iconEmoji}>💧</Text>
              </View>
              <View style={styles.cardTitleTextContainer}>
                <Text style={styles.cardTitleSmall} numberOfLines={1} ellipsizeMode="tail">
                  Вода
                </Text>
                <Text
                  style={styles.cardSubtitleSmall}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {stats.water} / {(settings?.waterGoal ?? 2000)} мл
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onToggleWaterReminders} activeOpacity={0.7}>
              <Text
                style={[
                  styles.cardBell,
                  waterRemindersEnabled && styles.cardBellActive,
                ]}
              >
                🔔
              </Text>
            </TouchableOpacity>
          </View>
          <ProgressBar
            current={stats.water}
            max={settings?.waterGoal ?? 2000}
            color="#06B6D4"
          />
          <View style={styles.row}>
            <AppButton title="+250" onPress={() => addWater(250)} />
            <View style={{ width: 8 }} />
            <AppButton title="+500" onPress={() => addWater(500)} />
          </View>
          <View style={{ marginTop: 8 }}>
            <AppButton title="Напоминания" onPress={onEnableWaterReminders} />
          </View>
        </View>

        <View style={[styles.cardSmall, { flex: 1, marginLeft: 8 }] }>
          <View style={styles.cardHeaderRowAlt}>
            <View style={styles.cardTitleRowLeft}>
              <View style={[styles.iconCircle, styles.iconSleep]}>
                <Text style={styles.iconEmoji}>🌙</Text>
              </View>
              <View style={styles.cardTitleTextContainer}>
                <Text style={styles.cardTitleSmall} numberOfLines={1} ellipsizeMode="tail">
                  Сон
                </Text>
                <Text
                  style={styles.cardSubtitleSmall}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {stats.sleepHours > 0
                    ? `${stats.sleepHours} ч за последнюю ночь`
                    : 'Нет данных за сегодня'}
                </Text>
              </View>
            </View>
            {settings?.sleep.wakeAlarmEnabled && (
              <Text style={styles.sleepBadge}>⏰ {settings.sleep.wakeTime}</Text>
            )}
          </View>
          {stats.sleepHours > 0 ? (
            <ProgressBar
              current={stats.sleepHours}
              max={settings?.sleep.targetHours ?? 8}
              color="#4F46E5"
            />
          ) : (
            <View style={{ marginTop: 8 }} />
          )}
          <TouchableOpacity
            style={styles.sleepManageButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Sleep')}
          >
            <Text style={styles.sleepManageText}>Управление сном →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Карточка шагов и активности */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRowAlt}>
          <View style={styles.cardTitleRowLeft}>
            <View style={[styles.iconCircle, styles.iconActivity]}>
              <Text style={styles.iconEmoji}>❤️</Text>
            </View>
            <Text style={styles.cardTitleSmall}>Шаги и Активность</Text>
          </View>
          <Text style={styles.smallText}>
            {steps} / {(profile?.dailyStepGoal ?? 10000)} шагов
          </Text>
        </View>
        <ProgressBar
          current={steps}
          max={profile?.dailyStepGoal ?? 10000}
          color="#EF4444"
        />
        <View style={{ marginTop: 12 }}>
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.trainingButtonWrapper}
              activeOpacity={0.9}
              onPress={() => (navigation as any).navigate('ActivityLogger')}
            >
              <LinearGradient
                colors={['#f97316', '#fb7185']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.trainingButton}
              >
                <Text style={styles.trainingButtonText}>⚡ Добавить тренировку</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.syncButton}
              activeOpacity={0.85}
              onPress={onSyncSteps}
            >
              <Text style={styles.syncButtonText}>⟳ Синхронизация</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.foodAddRow}>
          <Text style={styles.cardTitle}>Питание</Text>
          <TouchableOpacity
            style={styles.foodAddButton}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('FoodLogger')}
          >
            <Text style={styles.foodAddButtonText}>Добавить приём пищи</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* История питания */}
      <View style={styles.card}>
        <View style={styles.foodHeaderRow}>
          <Text style={styles.cardTitle}>История питания</Text>
          <View style={styles.filterRowSmall}>
            {(
              [
                { key: 'today', label: 'Сегодня' },
                { key: 'week', label: '7 дней' },
                { key: 'custom', label: 'Период' },
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
        </View>

        {foodFilterType === 'custom' && (
          <View style={styles.customRangeRow}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartPicker(true)}
            >
              <Text style={styles.dateButtonLabel}>От</Text>
              <Text style={styles.dateButtonValue}>
                {foodDateRange.start || 'Выбрать дату'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowEndPicker(true)}
            >
              <Text style={styles.dateButtonLabel}>До</Text>
              <Text style={styles.dateButtonValue}>
                {foodDateRange.end || 'Выбрать дату'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {showStartPicker && (
          <DateTimePicker
            value={foodDateRange.start ? new Date(foodDateRange.start) : new Date()}
            mode="date"
            display="default"
            onChange={(_, date) => {
              setShowStartPicker(false);
              if (date) {
                const iso = date.toISOString().split('T')[0];
                setFoodDateRange((prev) => ({ ...prev, start: iso }));
              }
            }}
          />
        )}
        {showEndPicker && (
          <DateTimePicker
            value={foodDateRange.end ? new Date(foodDateRange.end) : new Date()}
            mode="date"
            display="default"
            onChange={(_, date) => {
              setShowEndPicker(false);
              if (date) {
                const iso = date.toISOString().split('T')[0];
                setFoodDateRange((prev) => ({ ...prev, end: iso }));
              }
            }}
          />
        )}

        {foodLoading ? (
          <ActivityIndicator />
        ) : filteredFoodEntries.length === 0 ? (
          <Text style={styles.noMealsText}>Нет записей за выбранный период.</Text>
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
                {item.imageUri && (
                  <Image source={{ uri: item.imageUri }} style={styles.mealImage} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.mealName}>{item.name}</Text>
                  <Text style={styles.mealMeta}>
                    {new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {foodFilterType !== 'today'
                      ? ` • ${new Date(ts).toLocaleDateString()}`
                      : ''}
                    {` • Оценка ${item.rating}/10`}
                  </Text>
                </View>
                <Text style={styles.mealCalories}>{Math.round(item.calories)} ккал</Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>

    {/* ---- Модальное окно с подробностями блюда ---- */}
    {selectedFood && (
      <View style={styles.foodModalOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={() => setSelectedFood(null)}
        />
        <View style={styles.foodModalCard}>
          {selectedFood.imageUri ? (
            <Image source={{ uri: selectedFood.imageUri }} style={styles.foodModalImage} />
          ) : (
            <View style={[styles.foodModalImage, styles.foodModalImagePlaceholder]}>
              <Text style={styles.foodModalPlaceholderEmoji}>🍽️</Text>
            </View>
          )}

          <View style={styles.foodModalContent}>
            <Text style={styles.foodModalTitle}>{selectedFood.name}</Text>

            <View style={styles.foodModalRatingRow}>
              <View style={styles.foodModalRatingBadge}>
                <Text style={styles.foodModalRatingText}>★ {selectedFood.rating}/10</Text>
              </View>
              <Text style={styles.foodModalCaloriesText}>{Math.round(selectedFood.calories)} ккал</Text>
            </View>

            <View style={styles.foodModalMacrosRow}>
              <View style={styles.foodModalMacroItem}>
                <Text style={styles.foodModalMacroValue}>{Math.round(selectedFood.protein)} г</Text>
                <Text style={styles.foodModalMacroLabel}>Белки</Text>
              </View>
              <View style={styles.foodModalMacroItem}>
                <Text style={styles.foodModalMacroValue}>{Math.round(selectedFood.fat)} г</Text>
                <Text style={styles.foodModalMacroLabel}>Жиры</Text>
              </View>
              <View style={styles.foodModalMacroItem}>
                <Text style={styles.foodModalMacroValue}>{Math.round(selectedFood.carbs)} г</Text>
                <Text style={styles.foodModalMacroLabel}>Углеводы</Text>
              </View>
            </View>

            {selectedFood.recommendation ? (
              <View style={styles.foodModalRecommendationBox}>
                <Text style={styles.foodModalRecommendationLabel}>💡 Комментарий ИИ</Text>
                <Text style={styles.foodModalRecommendationText}>{selectedFood.recommendation}</Text>
              </View>
            ) : null}

            <Text style={styles.foodModalTimestamp}>
              {new Date(
                typeof selectedFood.timestamp === 'number'
                  ? selectedFood.timestamp
                  : new Date(selectedFood.timestamp).getTime(),
              ).toLocaleString([], {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          <TouchableOpacity style={styles.foodModalCloseButton} onPress={() => setSelectedFood(null)}>
            <Text style={styles.foodModalCloseText}>Закрыть</Text>
          </TouchableOpacity>
        </View>
      </View>
    )}
  </SafeAreaView>
  );
};

const macroGoalText = {
  fontSize: 12,
  color: '#9ca3af',
};

const styles = StyleSheet.create({
  macroGoalText,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
  },
  greetingSub: {
    marginTop: 4,
    color: '#6b7280',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '700',
    fontSize: 18,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  cardEmphasis: {
    backgroundColor: '#ecfdf5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#6ee7b7',
  },
  cardSmall: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 999,
    padding: 2,
  },
  filterChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  filterChipActive: {
    backgroundColor: '#111827',
  },
  filterChipText: {
    fontSize: 12,
    color: '#4b5563',
  },
  filterChipTextActive: {
    color: '#f9fafb',
    fontWeight: '600',
  },
  ringAndTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ringWrapper: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ringInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCalories: {
    fontSize: 20,
    fontWeight: '700',
  },
  ringLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  ringSideText: {
    flex: 1,
  },
  ringSideTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  ringSideSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  caloriesBig: {
    fontSize: 40,
    fontWeight: '800',
    marginVertical: 4,
  },
  caloriesSub: {
    color: '#6b7280',
    marginBottom: 8,
  },
  value: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  smallText: {
    color: '#6b7280',
    marginTop: 4,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  foodHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  macroCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  macroFooter: {
    marginTop: 8,
    fontSize: 12,
    color: '#6b7280',
  },
  ringLabelSmall: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  ringBurned: {
    fontSize: 11,
    color: '#f97316',
    marginTop: 2,
  },
  sleepBadge: {
    fontSize: 12,
    color: '#4F46E5',
  },
  cardHeaderRowAlt: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitleRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  iconWater: {
    backgroundColor: '#e0f2fe',
  },
  iconSleep: {
    backgroundColor: '#e0e7ff',
  },
  iconActivity: {
    backgroundColor: '#fee2e2',
  },
  iconEmoji: {
    fontSize: 16,
  },
  cardTitleTextContainer: {
    minWidth: 0,
    flexShrink: 1,
  },
  cardTitleSmall: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardSubtitleSmall: {
    fontSize: 11,
    color: '#6b7280',
  },
  cardBell: {
    fontSize: 16,
    color: '#9ca3af',
  },
  cardBellActive: {
    color: '#0ea5e9',
  },
  filterRowSmall: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    padding: 2,
  },
  filterChipSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  filterChipSmallActive: {
    backgroundColor: '#111827',
  },
  filterChipSmallText: {
    fontSize: 11,
    color: '#4b5563',
  },
  filterChipSmallTextActive: {
    color: '#f9fafb',
    fontWeight: '600',
  },
  customRangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dateButton: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginRight: 8,
  },
  dateButtonLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  dateButtonValue: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
  },
  noMealsText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  mealImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 8,
  },
  mealName: {
    fontWeight: '600',
  },
  mealMeta: {
    fontSize: 12,
    color: '#6b7280',
  },
  mealCalories: {
    fontWeight: '600',
  },
  // ---- Стили для модального окна блюда ----
  foodModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 999,
  },
  foodModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
  },
  foodModalImage: {
    width: '100%',
    height: 180,
  },
  foodModalImagePlaceholder: {
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodModalPlaceholderEmoji: {
    fontSize: 48,
  },
  foodModalContent: {
    padding: 16,
  },
  foodModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111827',
  },
  foodModalRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  foodModalRatingBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  foodModalRatingText: {
    color: '#d97706',
    fontWeight: '700',
    fontSize: 13,
  },
  foodModalCaloriesText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  foodModalMacrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  foodModalMacroItem: {
    alignItems: 'center',
    flex: 1,
  },
  foodModalMacroValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  foodModalMacroLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  foodModalRecommendationBox: {
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  foodModalRecommendationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 4,
  },
  foodModalRecommendationText: {
    fontSize: 13,
    color: '#064e3b',
    lineHeight: 18,
  },
  foodModalTimestamp: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  foodModalCloseButton: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingVertical: 14,
    alignItems: 'center',
  },
  foodModalCloseText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  waterButton: {
    flex: 1,
    backgroundColor: '#ecfeff',
    borderRadius: 999,
    paddingVertical: 8,
    marginTop: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#7dd3fc',
    alignItems: 'center',
  },
  waterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0e7490',
  },
  waterReminderButton: {
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#ecfeff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  waterReminderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0369a1',
  },
  sleepManageButton: {
    marginTop: 10,
    alignSelf: 'flex-end',
  },
  sleepManageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },
  trainingButtonWrapper: {
    flex: 1.2,
    marginRight: 8,
  },
  trainingButton: {
    width: '100%',
    paddingVertical: 10,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainingButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  syncButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  syncButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
  },
  foodAddRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foodAddButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#10b981',
  },
  foodAddButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  progressOuter: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
    marginTop: 8,
  },
  progressInner: {
    height: '100%',
    borderRadius: 999,
  },
});
