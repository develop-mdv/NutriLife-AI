import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatMessage, sendChatMessage } from '../../api/ai';
import { AppButton } from '../../components/AppButton';
import { useTodayStats } from '../../hooks/useTodayStats';
import { useFoodToday } from '../../hooks/useFoodToday';
import { useHistoryStats } from '../../hooks/useHistoryStats';
import { getProfile, getSettings, UserProfileApi, SettingsApi } from '../../api/me';

const renderMessageText = (text: string, isUser: boolean) => {
  const paragraphs = text.split(/\n{2,}/g);
  return (
    <View>
      {paragraphs.map((para, pi) => {
        const lines = para.split('\n');
        return (
          <View key={pi} style={pi > 0 ? { marginTop: 4 } : null}>
            {lines.map((line, li) => {
              const baseStyle = isUser ? styles.textUser : styles.textModel;
              const boldStyle = isUser ? styles.textUserBold : styles.textModelBold;
              const segments = line.split(/(\*\*[^*]+\*\*)/g);
              return (
                <Text key={li} style={baseStyle}>
                  {segments.map((seg, si) => {
                    if (seg.startsWith('**') && seg.endsWith('**') && seg.length > 4) {
                      const content = seg.slice(2, -2);
                      return (
                        <Text key={si} style={boldStyle}>
                          {content}
                        </Text>
                      );
                    }
                    return <Text key={si}>{seg}</Text>;
                  })}
                </Text>
              );
            })}
          </View>
        );
      })}
    </View>
  );
};

export const ChatScreen: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: 'Привет! Я твой ИИ-тренер по питанию, сну и активности. Я вижу твои данные по питанию, сну и активности. Задай мне вопрос или попроси скорректировать план.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfileApi | null>(null);
  const [settings, setSettings] = useState<SettingsApi | null>(null);

  const { stats: todayStats } = useTodayStats();
  const { items: foodItems, load: loadFood } = useFoodToday();
  const { history } = useHistoryStats();

  useEffect(() => {
    (async () => {
      try {
        const [p, s] = await Promise.all([getProfile(), getSettings()]);
        setProfile(p.data);
        setSettings(s.data);
        // загрузим историю еды для контекста
        loadFood();
      } catch (e) {
        console.log('Ошибка загрузки профиля/настроек для чата', e);
      }
    })();
  }, [loadFood]);

  const context = useMemo(() => {
    if (!profile) return '';
    let ctx = 'Данные пользователя:\\n';
    const genderRu = profile.gender === 'male' ? 'мужской' : profile.gender === 'female' ? 'женский' : 'другой';
    ctx += `Имя: ${profile.name}, Возраст: ${profile.age}, Пол: ${genderRu}, Рост: ${profile.height}, Вес: ${profile.weight}, `;
    ctx += `Цель: ${profile.goal === 'lose_weight' ? 'Похудение' : profile.goal === 'gain_muscle' ? 'Набор массы' : 'Поддержание'}.\\n`;
    if (profile.allergies) ctx += `Аллергии: ${profile.allergies}\n`;
    if (profile.preferences) ctx += `Предпочтения: ${profile.preferences}\n`;
    if (profile.healthConditions) ctx += `Здоровье: ${profile.healthConditions}\n`;

    if (todayStats) {
      ctx += `Статистика за сегодня: ${todayStats.calories} ккал, ${todayStats.steps} шагов, ${todayStats.water} мл воды, сон ${todayStats.sleepHours} ч.\n`;
    }

    // История питания: последние 7 дней, сгруппировано по датам
    if (foodItems && foodItems.length > 0) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayStart = today.getTime();
      const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000; // последние 7 дней включая сегодня

      const recent = foodItems
        .filter((f) => {
          const ts = typeof f.timestamp === 'number' ? f.timestamp : new Date(f.timestamp).getTime();
          return ts >= weekStart;
        })
        .sort((a, b) => a.timestamp - b.timestamp);

      if (recent.length > 0) {
        const byDay: Record<string, string[]> = {};
        const labels: Record<string, string> = {};
        const todayIso = today.toISOString().slice(0, 10);

        for (const f of recent) {
          const ts = typeof f.timestamp === 'number' ? f.timestamp : new Date(f.timestamp).getTime();
          const d = new Date(ts);
          const key = d.toISOString().slice(0, 10);
          const dateLabel = d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' });
          const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
          const line = `${time} — ${f.name} (${Math.round(f.calories)} ккал)`;
          if (!byDay[key]) {
            byDay[key] = [];
            labels[key] = key === todayIso ? `Сегодня (${dateLabel})` : dateLabel;
          }
          byDay[key].push(line);
        }

        const sortedKeys = Object.keys(byDay).sort();
        for (const key of sortedKeys) {
          const label = labels[key] || key;
          const lines = byDay[key].join('; ');
          ctx += `Питание ${label}: ${lines}.\\n`;
        }
      }
    }

    // Последний сон из истории
    if (history && history.length > 0) {
      const lastSleep = [...history]
        .slice()
        .reverse()
        .find((d) => d.sleepHours && d.sleepHours > 0);
      if (lastSleep) {
        ctx += `Последний сон: ${lastSleep.sleepHours} часов (дата ${lastSleep.date}).\n`;
      }
    }

    // Настройки сна
    if (settings?.sleep) {
      const s = settings.sleep;
      ctx += `Настройки сна: цель ${s.targetHours} ч, отбой ${s.bedTime}, подъём ${s.wakeTime} (${s.wakeAlarmEnabled ? 'будильник включен' : 'будильник выключен'}).\n`;
    }

    return ctx;
  }, [profile, todayStats, foodItems, history, settings]);

  const onSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await sendChatMessage(messages, text, context || undefined);
      const rawText = res.data.text;

      // Обработка тега [UPDATE_PLAN: ...] как в веб-версии
      const updateMatch = rawText.match(/\[UPDATE_PLAN:\s*(.*?)\]/);
      let displayText = rawText;

      if (updateMatch) {
        const wishes = updateMatch[1];
        displayText = displayText.replace(updateMatch[0], '').trim();
        setMessages((prev) => [...prev, { role: 'model', text: displayText }]);

        try {
          const { generateRoadmap } = await import('../../api/me');
          await generateRoadmap(wishes || undefined);
          setMessages((prev) => [
            ...prev,
            {
              role: 'model',
              text: '**✅ План успешно обновлен!** Зайдите в профиль, чтобы увидеть новую стратегию.',
            },
          ]);
        } catch (e) {
          console.log('Ошибка обновления плана из чата', e);
          setMessages((prev) => [
            ...prev,
            {
              role: 'model',
              text: '❌ Не удалось обновить план. Попробуйте еще раз или измените цели в профиле.',
            },
          ]);
        } finally {
          setLoading(false);
        }
        return;
      }

      const reply: ChatMessage = { role: 'model', text: displayText };
      setMessages((prev) => [...prev, reply]);
    } catch (e) {
      console.log('Ошибка чата', e);
      const fallback: ChatMessage = {
        role: 'model',
        text: 'Извини, ИИ-тренер сейчас недоступен (проблемы с сервером или квотой). Попробуй позже.',
      };
      setMessages((prev) => [...prev, fallback]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
      <View style={styles.header}>
        <Text style={styles.title}>Ассистент</Text>
        <Text style={styles.subtitle}>Твой ИИ-тренер по питанию, сну и активности</Text>
      </View>

      <ScrollView
        style={styles.messages}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 16, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((m, idx) => (
          <View
            key={idx}
            style={[
              styles.bubble,
              m.role === 'user' ? styles.bubbleUser : styles.bubbleModel,
            ]}
          >
            {renderMessageText(m.text, m.role === 'user')}
          </View>
        ))}
        {loading && (
          <View style={[styles.bubble, styles.bubbleModel]}>
            <ActivityIndicator />
          </View>
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Напишите сообщение..."
          multiline
        />
        <AppButton title="▶" onPress={onSend} disabled={loading} />
      </View>
    </KeyboardAvoidingView>
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
    padding: 12,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#555',
    marginTop: 4,
  },
  messages: {
    flex: 1,
    marginVertical: 8,
  },
  bubble: {
    marginVertical: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    maxWidth: '85%',
  },
  bubbleUser: {
    backgroundColor: '#4ade80',
    alignSelf: 'flex-end',
  },
  bubbleModel: {
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  textUser: {
    color: '#06281e',
    fontSize: 14,
  },
  textModel: {
    color: '#111827',
    fontSize: 14,
  },
  textUserBold: {
    fontWeight: '700',
  },
  textModelBold: {
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
    paddingTop: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    maxHeight: 80,
  },
});
