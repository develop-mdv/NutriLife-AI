import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Button,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTodayStats } from '../../hooks/useTodayStats';
import { useHistoryStats } from '../../hooks/useHistoryStats';
import {
  getProfile,
  getSettings,
  updateProfile,
  updateSettings,
  UserProfileApi,
  SettingsApi,
} from '../../api/me';

type ActiveTab = 'stats' | 'settings';
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
  const { stats: todayStats } = useTodayStats();
  const { loading: historyLoading, history, summary } = useHistoryStats();

  const [activeTab, setActiveTab] = useState<ActiveTab>('stats');
  const [historyPeriod, setHistoryPeriod] = useState<HistoryPeriod>('week');

  const [profile, setProfile] = useState<UserProfileApi | null>(null);
  const [settings, setSettings] = useState<SettingsApi | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [p, s] = await Promise.all([getProfile(), getSettings()]);
        setProfile(p.data);
        setSettings(s.data);
      } catch (e) {
        console.log('Ошибка загрузки профиля', e);
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
    } catch (e) {
      console.log('Ошибка сохранения профиля/настроек', e);
    } finally {
      setSaving(false);
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
        <Button title="Выйти" onPress={logout} />
      </View>
    );
  }

  const waterGoal = settings.waterGoal;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{(profile.name || user?.name || 'N')[0]?.toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{profile.name || user?.name}</Text>
          {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
          <Text style={styles.goalText}>Цель: {translateGoal(profile.goal)}</Text>
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
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>Статистика</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'settings' && styles.tabButtonActive]}
          onPress={() => setActiveTab('settings')}
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
                  onChangeText={(text) => setProfile({ ...profile, name: text })}
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
                  onChangeText={(text) =>
                    setProfile({ ...profile, height: Number(text) || 0 })
                  }
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Вес (кг)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={String(profile.weight || '')}
                  onChangeText={(text) =>
                    setProfile({ ...profile, weight: Number(text) || 0 })
                  }
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
                  onChangeText={(text) =>
                    setProfile({ ...profile, age: Number(text) || 0 })
                  }
                />
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
                  onChangeText={(text) =>
                    setProfile({
                      ...profile,
                      dailyCalorieGoal: Number(text) || 0,
                    })
                  }
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
                  onChangeText={(text) =>
                    setProfile({
                      ...profile,
                      dailyStepGoal: Number(text) || 0,
                    })
                  }
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Вода (мл/день)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={String(settings.waterGoal || '')}
                  onChangeText={(text) =>
                    setSettings({
                      ...settings,
                      waterGoal: Number(text) || 0,
                    })
                  }
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
                onChangeText={(text) =>
                  setProfile({ ...profile, allergies: text })
                }
                placeholder="Орехи, мед..."
              />
            </View>
            <View style={styles.formFieldFull}>
              <Text style={styles.formLabel}>Предпочтения</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                value={profile.preferences || ''}
                onChangeText={(text) =>
                  setProfile({ ...profile, preferences: text })
                }
                placeholder="Вегетарианец, люблю острое..."
              />
            </View>
            <View style={styles.formFieldFull}>
              <Text style={styles.formLabel}>Здоровье</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                value={profile.healthConditions || ''}
                onChangeText={(text) =>
                  setProfile({ ...profile, healthConditions: text })
                }
                placeholder="Диабет, травма колена..."
              />
            </View>
          </View>

          {/* Сон и напоминания о приёмах пищи (упрощённо) */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Сон и напоминания</Text>
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Цель сна (ч)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={String(settings.sleep.targetHours || '')}
                  onChangeText={(text) =>
                    setSettings({
                      ...settings,
                      sleep: {
                        ...settings.sleep,
                        targetHours: Number(text) || 0,
                      },
                    })
                  }
                />
              </View>
            </View>
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Отбой (ч:мм)</Text>
                <TextInput
                  style={styles.input}
                  value={settings.sleep.bedTime}
                  onChangeText={(text) =>
                    setSettings({
                      ...settings,
                      sleep: { ...settings.sleep, bedTime: text },
                    })
                  }
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Подъём (ч:мм)</Text>
                <TextInput
                  style={styles.input}
                  value={settings.sleep.wakeTime}
                  onChangeText={(text) =>
                    setSettings({
                      ...settings,
                      sleep: { ...settings.sleep, wakeTime: text },
                    })
                  }
                />
              </View>
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.formLabel}>Напоминать перед сном</Text>
              <Switch
                value={settings.sleep.bedTimeReminderEnabled}
                onValueChange={(value) =>
                  setSettings({
                    ...settings,
                    sleep: { ...settings.sleep, bedTimeReminderEnabled: value },
                  })
                }
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.formLabel}>Будильник по утрам</Text>
              <Switch
                value={settings.sleep.wakeAlarmEnabled}
                onValueChange={(value) =>
                  setSettings({
                    ...settings,
                    sleep: { ...settings.sleep, wakeAlarmEnabled: value },
                  })
                }
              />
            </View>
          </View>

          <View style={{ marginTop: 8 }}>
            <Button title={saving ? 'Сохранение...' : 'Сохранить профиль'} onPress={onSaveSettings} />
          </View>
        </>
      )}

      <View style={{ marginTop: 24 }}>
        <Button title="Выйти" onPress={logout} />
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
  goalText: {
    marginTop: 4,
    color: '#059669',
    fontWeight: '600',
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
    flexBasis: '48%',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    marginRight: '4%',
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
});
