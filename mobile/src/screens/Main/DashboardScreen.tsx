import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Circle } from 'react-native-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSteps } from '../../hooks/useSteps';
import { useTodayStats } from '../../hooks/useTodayStats';
import { useNotificationsSetup, scheduleWaterReminder } from '../../hooks/useNotifications';
import { useFoodToday } from '../../hooks/useFoodToday';
import { MainStackParamList } from '../../navigation/MainStack';
import { useAuth } from '../../context/AuthContext';
import { useHistoryStats } from '../../hooks/useHistoryStats';

type Nav = NativeStackNavigationProp<MainStackParamList, 'Tabs'>;

type Period = 'today' | '7d' | '30d';

type FoodFilterType = 'today' | 'week' | 'custom';

export const DashboardScreen: React.FC = () => {
  useNotificationsSetup();
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { steps } = useSteps(true);
  const { stats, loading, addWater } = useTodayStats();
  const { items: foodItems, loading: foodLoading, load: loadFood } = useFoodToday();
  const { summary, loading: historyLoading } = useHistoryStats();
  const [period, setPeriod] = useState<Period>('today');
  const [foodFilterType, setFoodFilterType] = useState<FoodFilterType>('today');
  const [foodDateRange, setFoodDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [expandedFoodId, setExpandedFoodId] = useState<string | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadFood();
    }, [loadFood]),
  );

  const onEnableWaterReminders = async () => {
    await scheduleWaterReminder(120); // каждые 2 часа
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

  // калории по выбранному периоду для диаграммы
  const calorieGoal = 2000;
  let caloriesForPeriod = stats.calories;
  let periodTitle = 'Калории сегодня';
  let periodSubtitle = 'Сумма калорий за сегодня';

  if (period === '7d') {
    caloriesForPeriod = summary.last7.avgCalories;
    periodTitle = 'Средние калории (7 дней)';
    periodSubtitle = 'Средняя дневная норма за последние 7 дней';
  } else if (period === '30d') {
    caloriesForPeriod = summary.last30.avgCalories;
    periodTitle = 'Средние калории (30 дней)';
    periodSubtitle = 'Средняя дневная норма за последние 30 дней';
  }

  const progress = Math.min(caloriesForPeriod / calorieGoal, 1);
  const RING_SIZE = 140;
  const STROKE_WIDTH = 14;
  const radius = (RING_SIZE - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - circumference * progress;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Header, как в веб-версии */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>Привет, {user?.name || 'друг'} 👋</Text>
          <Text style={styles.greetingSub}>Давай достигнем целей сегодня!</Text>
        </View>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {(user?.name || 'N')[0]?.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Калории, фильтры периода и диаграмма */}
      <View style={styles.cardEmphasis}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>{periodTitle}</Text>
          <View style={styles.filterRow}>
            {(
              [
                { key: 'today', label: 'Сегодня' },
                { key: '7d', label: '7 дней' },
                { key: '30d', label: '30 дней' },
              ] as { key: Period; label: string }[]
            ).map((p) => (
              <TouchableOpacity
                key={p.key}
                style={[styles.filterChip, period === p.key && styles.filterChipActive]}
                onPress={() => setPeriod(p.key)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    period === p.key && styles.filterChipTextActive,
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.ringAndTextRow}>
          <View style={styles.ringWrapper}>
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
              {historyLoading && period !== 'today' ? (
                <ActivityIndicator />
              ) : (
                <>
                  <Text style={styles.ringCalories}>{caloriesForPeriod}</Text>
                  <Text style={styles.ringLabel}>из {calorieGoal} ккал</Text>
                </>
              )}
            </View>
          </View>
          <View style={styles.ringSideText}>
            <Text style={styles.ringSideTitle}>{periodTitle}</Text>
            <Text style={styles.ringSideSubtitle}>{periodSubtitle}</Text>
          </View>
        </View>

        <View style={styles.macrosRow}>
          <View style={styles.macroCol}>
            <Text style={[styles.macroDot, { backgroundColor: '#34D399' }]} />
            <Text style={styles.macroLabel}>Белки</Text>
            <Text style={styles.macroValue}>{Math.round(totalProtein)} г</Text>
          </View>
          <View style={styles.macroCol}>
            <Text style={[styles.macroDot, { backgroundColor: '#FBBF24' }]} />
            <Text style={styles.macroLabel}>Жиры</Text>
            <Text style={styles.macroValue}>{Math.round(totalFat)} г</Text>
          </View>
          <View style={styles.macroCol}>
            <Text style={[styles.macroDot, { backgroundColor: '#60A5FA' }]} />
            <Text style={styles.macroLabel}>Углеводы</Text>
            <Text style={styles.macroValue}>{Math.round(totalCarbs)} г</Text>
          </View>
        </View>

        <Text style={styles.macroFooter}>
          Макросы за сегодня. Всего из еды: {Math.round(totalCaloriesFromFood)} ккал
        </Text>
      </View>

      {/* Вода и сон в одну строку, как две карточки */}
      <View style={styles.rowBetween}>
        <View style={[styles.cardSmall, { flex: 1, marginRight: 8 }] }>
          <Text style={styles.cardTitle}>Вода</Text>
          <Text style={styles.value}>{stats.water} мл</Text>
          <View style={styles.row}>
            <Button title="+250" onPress={() => addWater(250)} />
            <Button title="+500" onPress={() => addWater(500)} />
          </View>
          <View style={{ marginTop: 8 }}>
            <Button title="Напоминания" onPress={onEnableWaterReminders} />
          </View>
        </View>

        <View style={[styles.cardSmall, { flex: 1, marginLeft: 8 }] }>
          <Text style={styles.cardTitle}>Сон</Text>
          <Text style={styles.value}>{stats.sleepHours} ч</Text>
          <Text style={styles.smallText}>За последнюю ночь</Text>
          <View style={{ marginTop: 8 }}>
            <Button title="Записать сон" onPress={() => navigation.navigate('Sleep')} />
          </View>
        </View>
      </View>

      {/* Карточка шагов и кнопка к логгеру еды */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Активность и шаги</Text>
        <Text style={styles.value}>{steps}</Text>
        <Text>Цель: 10000 шагов</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Питание</Text>
        <Button title="Добавить приём пищи" onPress={() => navigation.navigate('FoodLogger')} />
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
            const isExpanded = expandedFoodId === String(item.id ?? item.timestamp);
            return (
              <TouchableOpacity
                key={String(item.id ?? item.timestamp)}
                style={[styles.mealRow, isExpanded && styles.mealRowExpanded]}
                activeOpacity={0.8}
                onPress={() =>
                  setExpandedFoodId((prev) =>
                    prev === String(item.id ?? item.timestamp)
                      ? null
                      : String(item.id ?? item.timestamp),
                  )
                }
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
                  {isExpanded && (
                    <View style={styles.mealExpandedBlock}>
                      <Text style={styles.mealExpandedText}>
                        Белки: {Math.round(item.protein)} г, Жиры: {Math.round(item.fat)} г, Углеводы:{' '}
                        {Math.round(item.carbs)} г
                      </Text>
                      {item.recommendation ? (
                        <Text style={styles.mealRecommendation}>
                          {item.recommendation}
                        </Text>
                      ) : null}
                    </View>
                  )}
                </View>
                <Text style={styles.mealCalories}>{Math.round(item.calories)} ккал</Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
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
  mealRowExpanded: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 4,
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
  mealExpandedBlock: {
    marginTop: 4,
  },
  mealExpandedText: {
    fontSize: 12,
    color: '#4b5563',
  },
  mealRecommendation: {
    marginTop: 2,
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  mealCalories: {
    fontWeight: '600',
  },
});
