import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { AppButton } from '../../components/AppButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainStack';
import {
  updateSleepToday,
  updateSleepByDate,
  getSettings,
  updateSettings,
  getHistory,
  SettingsApi,
  DailyStats,
} from '../../api/me';
import {
  scheduleDailySleepNotification,
  cancelSleepNotifications,
  SleepNotificationType,
} from '../../hooks/useNotifications';
import { useTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../constants/Theme';

export type SleepScreenProps = NativeStackScreenProps<MainStackParamList, 'Sleep'>;

type SleepTab = 'log' | 'settings' | 'tips';

interface SleepEntry {
  date: string; // YYYY-MM-DD
  durationHours: number;
  quality: number;
}

export const SleepScreen: React.FC<SleepScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const [activeTab, setActiveTab] = useState<SleepTab>('log');

  const [duration, setDuration] = useState(7.5);
  const [quality, setQuality] = useState(7);
  const [isLoggedToday, setIsLoggedToday] = useState(false);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState<SettingsApi | null>(null);
  const [sleepEntries, setSleepEntries] = useState<SleepEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<SleepEntry | null>(null);
  const [editDuration, setEditDuration] = useState(7);
  const [editQuality, setEditQuality] = useState(7);

  const loadSleepData = async () => {
    try {
      const [s, h] = await Promise.all([
        getSettings(),
        getHistory(),
      ]);
      setSettings(s.data);
      const lastStats: DailyStats[] = h.data || [];
      const entries: SleepEntry[] = lastStats
        .filter((d) => d.sleepHours && d.sleepHours > 0)
        .map((d) => ({
          date: d.date,
          durationHours: d.sleepHours,
          quality: d.sleepQuality || 7,
        }));
      setSleepEntries(entries);

      // Проверяем, есть ли запись за сегодня
      const today = new Date().toISOString().split('T')[0];
      const hasToday = entries.some((e) => e.date === today);
      setIsLoggedToday(hasToday);
    } catch (e) {
      console.log('Ошибка загрузки настроек/истории сна', e);
    }
  };

  useEffect(() => {
    loadSleepData();
  }, []);

  const onSaveLog = async () => {
    const h = Number(duration);
    if (isNaN(h) || h <= 0 || h > 24) {
      Alert.alert('Ошибка', 'Введите количество часов от 1 до 24');
      return;
    }
    try {
      setSaving(true);
      await updateSleepToday(h, quality);
      const today = new Date().toISOString().split('T')[0];
      const entry: SleepEntry = {
        date: today,
        durationHours: h,
        quality,
      };
      setSleepEntries((prev) => {
        const filtered = prev.filter((e) => e.date !== today);
        return [...filtered, entry];
      });
      setIsLoggedToday(true);
      Alert.alert('Готово', 'Данные о сне сохранены');
    } catch (e) {
      console.log('Ошибка сохранения сна', e);
      Alert.alert('Ошибка', 'Не удалось сохранить данные');
    } finally {
      setSaving(false);
    }
  };

  const onEditEntry = (entry: SleepEntry) => {
    setEditingEntry(entry);
    setEditDuration(entry.durationHours);
    setEditQuality(entry.quality);
  };

  const onSaveEdit = async () => {
    if (!editingEntry) return;
    try {
      setSaving(true);
      await updateSleepByDate(editingEntry.date, editDuration, editQuality);
      setSleepEntries((prev) =>
        prev.map((e) =>
          e.date === editingEntry.date
            ? { ...e, durationHours: editDuration, quality: editQuality }
            : e
        )
      );
      setEditingEntry(null);
      Alert.alert('Готово', 'Запись обновлена');
    } catch (e) {
      console.log('Ошибка редактирования', e);
      Alert.alert('Ошибка', 'Не удалось обновить запись');
    } finally {
      setSaving(false);
    }
  };

  const updateSleepConfig = async (nextSleep: SettingsApi['sleep']) => {
    if (!settings) return;
    const next: SettingsApi = { ...settings, sleep: nextSleep };
    setSettings(next);
    try {
      await updateSettings({ sleep: nextSleep });
    } catch (e) {
      console.log('Ошибка обновления настроек сна', e);
    }
  };

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
      console.log('Ошибка планирования уведомления сна', e);
    }
  };

  const handleToggleWakeAlarm = async () => {
    if (!settings) return;
    const nextEnabled = !settings.sleep.wakeAlarmEnabled;
    await scheduleOrCancelSleep('sleep_wake', nextEnabled, settings.sleep.wakeTime);
    updateSleepConfig({
      ...settings.sleep,
      wakeAlarmEnabled: nextEnabled,
    });
  };

  const handleToggleBedReminder = async () => {
    if (!settings) return;
    const nextEnabled = !settings.sleep.bedTimeReminderEnabled;
    await scheduleOrCancelSleep('sleep_bed', nextEnabled, settings.sleep.bedTime);
    updateSleepConfig({
      ...settings.sleep,
      bedTimeReminderEnabled: nextEnabled,
    });
  };

  const onChangeWakeTime = async (value: string) => {
    if (!settings) return;
    updateSleepConfig({
      ...settings.sleep,
      wakeTime: value,
    });
    if (settings.sleep.wakeAlarmEnabled) {
      await scheduleOrCancelSleep('sleep_wake', true, value);
    }
  };

  const onChangeBedTime = async (value: string) => {
    if (!settings) return;
    updateSleepConfig({
      ...settings.sleep,
      bedTime: value,
    });
    if (settings.sleep.bedTimeReminderEnabled) {
      await scheduleOrCancelSleep('sleep_bed', true, value);
    }
  };

  const onChangeTargetHours = (text: string) => {
    if (!settings) return;
    const h = Number(text.replace(',', '.')) || 0;
    updateSleepConfig({
      ...settings.sleep,
      targetHours: h,
    });
  };

  const sortedEntries = useMemo(
    () => [...sleepEntries].sort((a, b) => b.date.localeCompare(a.date)),
    [sleepEntries],
  );

  const tips = useMemo(
    () => [
      {
        title: 'Режим - это ключ',
        text: 'Ложитесь и вставайте в одно и то же время, даже в выходные.',
      },
      {
        title: 'Цифровой детокс',
        text: 'Убирайте телефон за час до сна. Синий свет мешает выработке мелатонина.',
      },
      {
        title: 'Температура',
        text: 'Идеальная температура для сна — 18-20°C.',
      },
      {
        title: 'Кофеин',
        text: 'Избегайте кофеина после 14:00.',
      },
    ],
    [],
  );

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Сон и восстановление 🌙</Text>
            <Text style={styles.subtitle}>Качество сна влияет на все аспекты жизни</Text>
          </View>
          <TouchableOpacity style={styles.closeIconButton} onPress={() => navigation.goBack()}>
            <Text style={styles.closeIconText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {([
            { key: 'log', label: 'Дневник' },
            { key: 'settings', label: 'Будильник' },
            { key: 'tips', label: 'Советы' },
          ] as { key: SleepTab; label: string }[]).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabButton,
                activeTab === tab.key && styles.tabButtonActive,
              ]}
              activeOpacity={0.85}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* LOG TAB */}
        {activeTab === 'log' && (
          <View style={styles.section}>
            {isLoggedToday ? (
              <View style={styles.successCard}>
                <View style={styles.successIconCircle}>
                  <Text style={styles.successIcon}>✓</Text>
                </View>
                <Text style={styles.successTitle}>Данные записаны!</Text>
                <Text style={styles.successSubtitle}>Сладких снов на следующую ночь.</Text>
              </View>
            ) : (
              <View style={styles.logCard}>
                <Text style={styles.logTitle}>Как вы спали?</Text>

                {/* Длительность сна */}
                <View style={styles.logBlock}>
                  <View style={styles.logLabelRow}>
                    <Text style={styles.logLabel}>Длительность</Text>
                    <Text style={styles.logValue}>{duration} ч.</Text>
                  </View>
                  <View style={styles.sliderRow}>
                    <TextInput
                      style={styles.sliderInput}
                      keyboardType="numeric"
                      value={String(duration)}
                      onChangeText={(text) => {
                        const v = Number(text.replace(',', '.'));
                        if (!isNaN(v)) setDuration(Math.max(3, Math.min(12, v)));
                      }}
                      placeholderTextColor={theme.colors.textMuted}
                    />
                    <View style={styles.presetRow}>
                      {[6, 7, 8].map((h) => (
                        <TouchableOpacity
                          key={h}
                          style={styles.presetButton}
                          onPress={() => setDuration(h)}
                        >
                          <Text style={styles.presetButtonText}>{h} ч</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Качество сна */}
                <View style={styles.logBlock}>
                  <View style={styles.logLabelRow}>
                    <Text style={styles.logLabel}>Качество (1–10)</Text>
                    <Text style={styles.logValue}>{quality}/10</Text>
                  </View>
                  <View style={styles.qualityRow}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                      <TouchableOpacity
                        key={v}
                        style={[
                          styles.qualityButton,
                          quality === v && styles.qualityButtonActive,
                        ]}
                        activeOpacity={0.9}
                        onPress={() => setQuality(v)}
                      >
                        <Text
                          style={[
                            styles.qualityButtonText,
                            quality === v && styles.qualityButtonTextActive,
                          ]}
                        >
                          {v}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <AppButton
                  title={saving ? 'Сохраняю...' : 'Сохранить запись'}
                  onPress={onSaveLog}
                  disabled={saving}
                />
              </View>
            )}

            {/* История сна */}
            <View style={styles.historySection}>
              <Text style={styles.historyTitle}>История сна</Text>
              {sortedEntries.length === 0 ? (
                <Text style={styles.historyEmpty}>Нет записей</Text>
              ) : (
                sortedEntries.slice(0, 7).map((e) => (
                  <TouchableOpacity
                    key={e.date}
                    style={styles.historyItem}
                    activeOpacity={0.8}
                    onPress={() => onEditEntry(e)}
                  >
                    <View>
                      <Text style={styles.historyItemDuration}>{e.durationHours} часов</Text>
                      <Text style={styles.historyItemDate}>
                        {new Date(e.date).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                          weekday: 'short',
                        })}
                      </Text>
                    </View>
                    <View style={styles.historyRightColumn}>
                      <View
                        style={[
                          styles.historyQualityBadge,
                          e.quality >= 7
                            ? styles.historyQualityGood
                            : e.quality >= 5
                              ? styles.historyQualityMedium
                              : styles.historyQualityBad,
                        ]}
                      >
                        <Text style={styles.historyQualityText}>{e.quality}/10</Text>
                      </View>
                      <Text style={styles.historyEditHint}>Редактировать</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        )}

        {/* Модальное окно редактирования */}
        {editingEntry && (
          <View style={styles.editModalOverlay}>
            <View style={styles.editModalCard}>
              <View style={styles.editModalHeader}>
                <Text style={styles.editModalTitle}>
                  Редактирование: {new Date(editingEntry.date).toLocaleDateString('ru-RU')}
                </Text>
                <TouchableOpacity onPress={() => setEditingEntry(null)}>
                  <Text style={styles.editModalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.logBlock}>
                <View style={styles.logLabelRow}>
                  <Text style={styles.logLabel}>Длительность</Text>
                  <Text style={styles.logValue}>{editDuration} ч.</Text>
                </View>
                <View style={styles.sliderRow}>
                  <TextInput
                    style={styles.sliderInput}
                    keyboardType="numeric"
                    value={String(editDuration)}
                    onChangeText={(text) => {
                      const v = Number(text.replace(',', '.'));
                      if (!isNaN(v)) setEditDuration(Math.max(1, Math.min(24, v)));
                    }}
                    placeholderTextColor={theme.colors.textMuted}
                  />
                  <View style={styles.presetRow}>
                    {[6, 7, 8].map((h) => (
                      <TouchableOpacity
                        key={h}
                        style={styles.presetButton}
                        onPress={() => setEditDuration(h)}
                      >
                        <Text style={styles.presetButtonText}>{h} ч</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.logBlock}>
                <View style={styles.logLabelRow}>
                  <Text style={styles.logLabel}>Качество (1–10)</Text>
                  <Text style={styles.logValue}>{editQuality}/10</Text>
                </View>
                <View style={styles.qualityRow}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                    <TouchableOpacity
                      key={v}
                      style={[
                        styles.qualityButton,
                        editQuality === v && styles.qualityButtonActive,
                      ]}
                      activeOpacity={0.9}
                      onPress={() => setEditQuality(v)}
                    >
                      <Text
                        style={[
                          styles.qualityButtonText,
                          editQuality === v && styles.qualityButtonTextActive,
                        ]}
                      >
                        {v}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <AppButton
                title={saving ? 'Сохраняю...' : 'Сохранить'}
                onPress={onSaveEdit}
                disabled={saving}
              />
            </View>
          </View>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && settings && (
          <View style={styles.section}>
            {/* Утренний будильник */}
            <View style={styles.settingsCard}>
              <View style={styles.settingsHeaderRow}>
                <View style={styles.settingsIconRow}>
                  <View style={[styles.settingsIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                    <Text style={styles.settingsIconEmoji}>⏰</Text>
                  </View>
                  <View>
                    <Text style={styles.settingsTitle}>Утренний будильник</Text>
                    <Text style={styles.settingsSubtitle}>Сигнал для пробуждения</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.switch}
                  activeOpacity={0.8}
                  onPress={handleToggleWakeAlarm}
                >
                  <View
                    style={[
                      styles.switchTrack,
                      settings.sleep.wakeAlarmEnabled && styles.switchTrackOn,
                    ]}
                  >
                    <View
                      style={[
                        styles.switchThumb,
                        settings.sleep.wakeAlarmEnabled && styles.switchThumbOn,
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              </View>
              <View style={styles.timeRow}>
                <TextInput
                  style={styles.timeInput}
                  value={settings.sleep.wakeTime}
                  onChangeText={onChangeWakeTime}
                  placeholderTextColor={theme.colors.textMuted}
                />
                <Text style={styles.timeHint}>время подъёма</Text>
              </View>
              <Text style={styles.settingsFootnote}>
                * Будильник придёт как уведомление приложения, когда реализуем напоминания.
              </Text>
            </View>

            {/* Напоминание о сне */}
            <View style={styles.settingsCard}>
              <View style={styles.settingsHeaderRow}>
                <View style={styles.settingsIconRow}>
                  <View style={[styles.settingsIconCircle, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
                    <Text style={styles.settingsIconEmoji}>🌙</Text>
                  </View>
                  <View>
                    <Text style={styles.settingsTitle}>Напоминание о сне</Text>
                    <Text style={styles.settingsSubtitle}>Пора готовиться ко сну</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.switch}
                  activeOpacity={0.8}
                  onPress={handleToggleBedReminder}
                >
                  <View
                    style={[
                      styles.switchTrack,
                      settings.sleep.bedTimeReminderEnabled && styles.switchTrackOnPurple,
                    ]}
                  >
                    <View
                      style={[
                        styles.switchThumb,
                        settings.sleep.bedTimeReminderEnabled && styles.switchThumbOn,
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              </View>
              <View style={styles.timeRow}>
                <TextInput
                  style={styles.timeInput}
                  value={settings.sleep.bedTime}
                  onChangeText={onChangeBedTime}
                  placeholderTextColor={theme.colors.textMuted}
                />
                <Text style={styles.timeHint}>время отбоя</Text>
              </View>
            </View>

            {/* Цель сна */}
            <View style={styles.settingsCard}>
              <Text style={styles.goalLabel}>Цель сна (часов)</Text>
              <View style={styles.goalRow}>
                <TextInput
                  style={styles.goalInput}
                  keyboardType="numeric"
                  value={String(settings.sleep.targetHours ?? '')}
                  onChangeText={onChangeTargetHours}
                  placeholderTextColor={theme.colors.textMuted}
                />
                <Text style={styles.timeHint}>часов / ночь</Text>
              </View>
            </View>
          </View>
        )}

        {/* TIPS TAB */}
        {activeTab === 'tips' && (
          <View style={styles.section}>
            {tips.map((tip, idx) => (
              <View key={idx} style={styles.tipCard}>
                <Text style={styles.tipTitle}>✨ {tip.title}</Text>
                <Text style={styles.tipText}>{tip.text}</Text>
              </View>
            ))}
            <TouchableOpacity
              style={styles.tipChatCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Tabs')}
            >
              <Text style={styles.tipChatText}>
                💬 Спросите нашего ИИ-тренера о персональных советах по сну!
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  closeIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  closeIconText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceAlt,
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
    backgroundColor: theme.colors.surface,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  tabTextActive: {
    color: theme.colors.textPrimary,
  },
  section: {
    marginTop: 4,
  },
  // LOG TAB
  logCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  logTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  logBlock: {
    marginBottom: 16,
  },
  logLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  logLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  logValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.accentSleep,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sliderInput: {
    width: 70,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: theme.colors.background,
    textAlign: 'center',
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginRight: 8,
  },
  presetRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  presetButton: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  presetButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  qualityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  qualityButton: {
    width: '9%',
    minWidth: 28,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  qualityButtonActive: {
    backgroundColor: theme.colors.accentSleep,
    borderColor: theme.colors.accentSleep,
  },
  qualityButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  qualityButtonTextActive: {
    color: '#000000', // Black on neon green
  },
  successCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.accentSleep,
    marginBottom: 16,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.accentSleep,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successIcon: {
    fontSize: 32,
    color: '#000000',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  successSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  historySection: {
    marginTop: 24,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  historyEmpty: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  historyItemDuration: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  historyItemDate: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  historyRightColumn: {
    alignItems: 'flex-end',
  },
  historyQualityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
    backgroundColor: theme.colors.background,
  },
  historyQualityText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  historyQualityGood: {
    // borderLeftWidth: 3, borderLeftColor: '#16a34a' 
  },
  historyQualityMedium: {
    // borderLeftWidth: 3, borderLeftColor: '#f59e0b'
  },
  historyQualityBad: {
    // borderLeftWidth: 3, borderLeftColor: '#ef4444'
  },
  historyEditHint: {
    fontSize: 10,
    color: theme.colors.accentSleep,
  },
  // Edit Modal
  editModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 16,
  },
  editModalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  editModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  editModalCloseText: {
    fontSize: 24,
    color: theme.colors.textMuted,
    lineHeight: 24,
  },
  // SETTINGS TAB
  settingsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  settingsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingsIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIconEmoji: {
    fontSize: 20,
  },
  settingsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  settingsSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  switch: {
    padding: 4,
  },
  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchTrackOn: {
    backgroundColor: theme.colors.accentSystem,
  },
  switchTrackOnPurple: {
    backgroundColor: '#8b5cf6',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  switchThumbOn: {
    alignSelf: 'flex-end',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  timeInput: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 0,
    minWidth: 100,
  },
  timeHint: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  settingsFootnote: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 12,
    fontStyle: 'italic',
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  goalInput: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 0,
    minWidth: 60,
    textAlign: 'center',
  },
  // TIPS TAB
  tipCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  tipText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  tipChatCard: {
    marginTop: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.accentSleep,
  },
  tipChatText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accentSleep,
    textAlign: 'center',
  },
});
