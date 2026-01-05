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
import { ChatDaySummary, ChatMessage, getChatDays, getChatHistory, sendChatMessage } from '../../api/ai';
import { AppButton } from '../../components/AppButton';

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState<ChatDaySummary[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [loadingDays, setLoadingDays] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const formatDayLabel = (day: string) => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const d = new Date(day);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    if (day === todayStr) return 'Сегодня';
    if (day === yesterdayStr) return 'Вчера';
    const dd = d.getDate().toString().padStart(2, '0');
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    return `${dd}.${mm}`;
  };

  const ensureGreetingIfEmpty = (day: string, items: ChatMessage[]): ChatMessage[] => {
    if (items.length > 0) return items;
    const label = formatDayLabel(day);
    return [
      {
        role: 'model',
        text: `Привет! Это чат с твоим ИИ-тренером за ${label.toLowerCase()}. Задай мне вопрос или попроси скорректировать план.`,
      },
    ];
  };

  const loadHistoryForDay = async (day: string) => {
    setLoadingHistory(true);
    try {
      const res = await getChatHistory(day, 100);
      const items = res.data || [];
      const mapped = items.map((m) => ({ role: m.role, text: m.text }));
      setMessages(ensureGreetingIfEmpty(day, mapped));
    } catch (e) {
      console.log('Ошибка загрузки истории чата за день', e);
      setMessages(ensureGreetingIfEmpty(day, []));
    } finally {
      setLoadingHistory(false);
    }
  };

  // При открытии экрана подгружаем список дней и историю за последний день
  useEffect(() => {
    (async () => {
      setLoadingDays(true);
      try {
        const res = await getChatDays();
        const list = res.data || [];
        setDays(list);
        const todayStr = new Date().toISOString().slice(0, 10);
        const initialDay = list.length > 0 ? list[0].day : todayStr;
        setSelectedDay(initialDay);
        await loadHistoryForDay(initialDay);
      } catch (e) {
        console.log('Ошибка загрузки списка дней чата', e);
        const todayStr = new Date().toISOString().slice(0, 10);
        setSelectedDay(todayStr);
        await loadHistoryForDay(todayStr);
      } finally {
        setLoadingDays(false);
      }
    })();
  }, []);

  const onSend = async () => {
    const text = input.trim();
    if (!text || loading || !selectedDay) return;

    const userMsg: ChatMessage = { role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Передаём только сообщения текущего дня как историю для модели
      const res = await sendChatMessage(messages, text);
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

      {/* Переключатель дневных чатов за неделю */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.daysRow}
      >
        {selectedDay && (
          <>
            {[selectedDay, ...days.filter((d) => d.day !== selectedDay).map((d) => d.day)]
              .filter((v, idx, arr) => arr.indexOf(v) === idx)
              .slice(0, 7)
              .map((day) => {
                const isActive = day === selectedDay;
                const summary = days.find((d) => d.day === day);
                return (
                  <AppButton
                    key={day}
                    title={summary ? `${formatDayLabel(day)}` : formatDayLabel(day)}
                    onPress={() => {
                      if (day === selectedDay) return;
                      setSelectedDay(day);
                      loadHistoryForDay(day);
                    }}
                    style={[
                      styles.dayChip,
                      isActive && styles.dayChipActive,
                    ]}
                  />
                );
              })}
          </>
        )}
      </ScrollView>

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
        {loadingHistory && (
          <View style={[styles.bubble, styles.bubbleModel]}>
            <ActivityIndicator />
          </View>
        )}
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
  daysRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    marginHorizontal: -4,
  },
  dayChip: {
    marginHorizontal: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d4d4d8',
    backgroundColor: '#ffffff',
  },
  dayChipActive: {
    backgroundColor: '#4ade80',
    borderColor: '#22c55e',
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
