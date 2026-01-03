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

export type SleepScreenProps = NativeStackScreenProps<MainStackParamList, 'Sleep'>;

type SleepTab = 'log' | 'settings' | 'tips';

interface SleepEntryLocal {
  id: string;
  durationHours: number;
  quality: number;
  timestamp: number;
}

export const SleepScreen: React.FC<SleepScreenProps> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<SleepTab>('log');

  const [duration, setDuration] = useState(7.5);
  const [quality, setQuality] = useState(7);
  const [isLoggedToday, setIsLoggedToday] = useState(false);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState<SettingsApi | null>(null);
  const [sleepEntries, setSleepEntries] = useState<SleepEntryLocal[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [s, h, localRaw] = await Promise.all([
          getSettings(),
          getHistory(),
          AsyncStorage.getItem('sleepHistoryLocal'),
        ]);
        setSettings(s.data);
        const lastStats: DailyStats[] = h.data || [];
        const serverEntries: SleepEntryLocal[] = lastStats
          .filter((d) => d.sleepHours && d.sleepHours > 0)
          .map((d) => ({
            id: d.date,
            durationHours: d.sleepHours,
            quality: 7,
            timestamp: new Date(d.date).getTime(),
          }));
        const localEntries: SleepEntryLocal[] = localRaw ? JSON.parse(localRaw) : [];
        const byKey = new Map<string, SleepEntryLocal>();
        [...serverEntries, ...localEntries].forEach((e) => {
          const key = new Date(e.timestamp).toISOString().split('T')[0];
          byKey.set(key, e);
        });
        const combined = Array.from(byKey.values()).sort((a, b) => a.timestamp - b.timestamp);
        setSleepEntries(combined);
      } catch (e) {
        console.log('Ошибка загрузки настроек/истории сна', e);
      }
    })();
  }, []);

  const onSaveLog = async () => {
    const h = Number(duration);
    if (isNaN(h) || h <= 0 || h > 24) {
      Alert.alert('Ошибка', 'Введите количество часов от 1 до 24');
      return;
    }
    try {
      setSaving(true);
      await updateSleepToday(h);
      const entry: SleepEntryLocal = {
        id: Date.now().toString(),
        durationHours: h,
        quality,
        timestamp: Date.now(),
      };
      setSleepEntries((prev) => {
        const next = [...prev, entry];
        AsyncStorage.setItem('sleepHistoryLocal', JSON.stringify(next)).catch(() => {});
        return next;
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

  const lastFiveEntries = useMemo(
    () => [...sleepEntries].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5),
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
          <View>
            <Text style={styles.title}>Сон и восстановление 🌙</Text>
            <Text style={styles.subtitle}>Качество сна влияет на все аспекты жизни</Text>
          </View>
          <AppButton title="Закрыть" onPress={() => navigation.goBack()} />
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
              {lastFiveEntries.length === 0 ? (
                <Text style={styles.historyEmpty}>Нет записей</Text>
              ) : (
                lastFiveEntries.map((e) => (
                  <View key={e.id} style={styles.historyItem}>
                    <View>
                      <Text style={styles.historyItemDuration}>{e.durationHours} часов</Text>
                      <Text style={styles.historyItemDate}>
                        {new Date(e.timestamp).toLocaleDateString()}
                      </Text>
                    </View>
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
                      <Text style={styles.historyQualityText}>Качество: {e.quality}</Text>
                    </View>
                  </View>
                ))
              )}
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
                  <View style={[styles.settingsIconCircle, { backgroundColor: '#e0e7ff' }] }>
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
                  <View style={[styles.settingsIconCircle, { backgroundColor: '#f3e8ff' }] }>
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

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#312e81',
  },
  subtitle: {
    color: '#6b7280',
    marginTop: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#e0e7ff',
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
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4f46e5',
  },
  tabTextActive: {
    color: '#1f2937',
  },
  section: {
    marginTop: 4,
  },
  // LOG TAB
  logCard: {
    backgroundColor: '#eef2ff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  logTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#312e81',
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
    color: '#312e81',
    textTransform: 'uppercase',
  },
  logValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4f46e5',
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
    borderColor: '#c7d2fe',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#eef2ff',
    textAlign: 'center',
    fontWeight: '600',
    color: '#1f2937',
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
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  presetButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4f46e5',
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
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  qualityButtonActive: {
    backgroundColor: '#4f46e5',
    elevation: 2,
  },
  qualityButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
  },
  qualityButtonTextActive: {
    color: '#ffffff',
  },
  successCard: {
    backgroundColor: '#dcfce7',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginBottom: 16,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#bbf7d0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successIcon: {
    fontSize: 32,
    color: '#15803d',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#166534',
  },
  successSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#16a34a',
  },
  historySection: {
    marginTop: 16,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#111827',
  },
  historyEmpty: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 8,
  },
  historyItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyItemDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  historyItemDate: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  historyQualityBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  historyQualityGood: {
    backgroundColor: '#dcfce7',
  },
  historyQualityMedium: {
    backgroundColor: '#fef9c3',
  },
  historyQualityBad: {
    backgroundColor: '#fee2e2',
  },
  historyQualityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
  },
  // SETTINGS TAB
  settingsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  settingsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  settingsIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  settingsIconEmoji: {
    fontSize: 18,
  },
  settingsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  settingsSubtitle: {
    fontSize: 11,
    color: '#6b7280',
  },
  switch: {
    paddingLeft: 8,
  },
  switchTrack: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  switchTrackOn: {
    backgroundColor: '#4f46e5',
  },
  switchTrackOnPurple: {
    backgroundColor: '#7e22ce',
  },
  switchThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
  },
  switchThumbOn: {
    alignSelf: 'flex-end',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timeInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 4,
    paddingRight: 8,
    minWidth: 80,
  },
  timeHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 8,
  },
  settingsFootnote: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 6,
  },
  goalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  goalInput: {
    width: 80,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  // TIPS TAB
  tipCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3730a3',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    color: '#4b5563',
  },
  tipChatCard: {
    marginTop: 4,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#e0e7ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  tipChatText: {
    fontSize: 13,
    color: '#4338ca',
    textAlign: 'center',
    fontWeight: '600',
  },
});
