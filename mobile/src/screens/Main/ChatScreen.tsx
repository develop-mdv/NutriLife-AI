import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatDaySummary, ChatMessage, getChatDays, getChatHistory, sendChatMessage } from '../../api/ai';
import { Colors } from '../../constants/Colors';

const renderInlineFormatting = (text: string, isUser: boolean) => {
  const baseStyle = isUser ? styles.textUser : styles.textModel;
  const boldStyle = isUser ? styles.textUserBold : styles.textModelBold;
  const segments = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return segments.map((seg, si) => {
    if (seg.startsWith('**') && seg.endsWith('**') && seg.length > 4) {
      return (
        <Text key={si} style={boldStyle}>
          {seg.slice(2, -2)}
        </Text>
      );
    }
    if (seg.startsWith('*') && seg.endsWith('*') && seg.length > 2) {
      return (
        <Text key={si} style={[baseStyle, { fontStyle: 'italic' }]}>
          {seg.slice(1, -1)}
        </Text>
      );
    }
    return <Text key={si}>{seg}</Text>;
  });
};

const renderMessageText = (text: string, isUser: boolean) => {
  const paragraphs = text.split(/\n{2,}/g);
  const baseStyle = isUser ? styles.textUser : styles.textModel;

  return (
    <View>
      {paragraphs.map((para, pi) => {
        const lines = para.split('\n');
        return (
          <View key={pi} style={pi > 0 ? { marginTop: 8 } : undefined}>
            {lines.map((line, li) => {
              const h3Match = line.match(/^###\s+(.*)/);
              if (h3Match) {
                return (
                  <Text key={li} style={[baseStyle, styles.h3]}>
                    {renderInlineFormatting(h3Match[1], isUser)}
                  </Text>
                );
              }
              const h2Match = line.match(/^##\s+(.*)/);
              if (h2Match) {
                return (
                  <Text key={li} style={[baseStyle, styles.h2]}>
                    {renderInlineFormatting(h2Match[1], isUser)}
                  </Text>
                );
              }
              const h1Match = line.match(/^#\s+(.*)/);
              if (h1Match) {
                return (
                  <Text key={li} style={[baseStyle, styles.h1]}>
                    {renderInlineFormatting(h1Match[1], isUser)}
                  </Text>
                );
              }

              const numberedMatch = line.match(/^(\d+)\.\s+(.*)/);
              if (numberedMatch) {
                return (
                  <View key={li} style={styles.listItem}>
                    <Text style={[baseStyle, styles.listNumber]}>{numberedMatch[1]}.</Text>
                    <Text style={[baseStyle, styles.listItemText]}>
                      {renderInlineFormatting(numberedMatch[2], isUser)}
                    </Text>
                  </View>
                );
              }

              const bulletMatch = line.match(/^[-*]\s+(.*)/);
              if (bulletMatch) {
                return (
                  <View key={li} style={styles.listItem}>
                    <Text style={[baseStyle, styles.bullet]}>•</Text>
                    <Text style={[baseStyle, styles.listItemText]}>
                      {renderInlineFormatting(bulletMatch[1], isUser)}
                    </Text>
                  </View>
                );
              }

              return (
                <Text key={li} style={baseStyle}>
                  {renderInlineFormatting(line, isUser)}
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
  const scrollRef = useRef<ScrollView | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState<ChatDaySummary[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [loadingDays, setLoadingDays] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const formatDayNice = (day: string) => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const d = new Date(day);
    const months = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
    ];
    const monthName = months[d.getMonth()];
    const dateNum = d.getDate();

    if (day === todayStr) {
      return `Сегодня — ${dateNum} ${monthName}`;
    }

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    if (day === yesterdayStr) {
      return `Вчера — ${dateNum} ${monthName}`;
    }

    return `${dateNum} ${monthName}`;
  };

  const ensureGreetingIfEmpty = (day: string, items: ChatMessage[]): ChatMessage[] => {
    if (items.length > 0) return items;
    const d = new Date(day);
    const dateStr = `${d.getDate()}.${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    return [
      {
        role: 'model',
        text: `Привет! Это чат за ${dateStr}. Чем могу помочь?`,
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

  // автоскролл при изменении количества сообщений
  useEffect(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [messages.length]);

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
      const res = await sendChatMessage(messages, text);
      const rawText = res.data.text;

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

  const selectedDaySummary = days.find((d) => d.day === selectedDay);
  const messageCount = selectedDaySummary ? selectedDaySummary.count : messages.length;

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.title}>Ассистент</Text>
            <Text style={styles.subtitle}>Твой ИИ-тренер по питанию, сну и активности</Text>
          </View>
          <TouchableOpacity onPress={() => setShowHistoryModal(true)}>
            <Text style={styles.headerHistoryLink}>История</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 16, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            if (scrollRef.current) {
              scrollRef.current.scrollToEnd({ animated: true });
            }
          }}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>💬</Text>
              <Text style={styles.emptyStateTitle}>Чат очищен</Text>
              <Text style={styles.emptyStateText}>
                Чат очищен, история перенесена в архив. В следующем сообщении можете начать новый разговор.
              </Text>
            </View>
          ) : (
            messages.map((m, idx) => (
              <View
                key={idx}
                style={[
                  styles.bubble,
                  m.role === 'user' ? styles.bubbleUser : styles.bubbleModel,
                ]}
              >
                {renderMessageText(m.text, m.role === 'user')}
              </View>
            ))
          )}
          {loadingHistory && (
            <View style={[styles.bubble, styles.bubbleModel]}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          )}
          {loading && (
            <View style={[styles.bubble, styles.bubbleModel]}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.inputField}
            value={input}
            onChangeText={setInput}
            placeholder="Напишите сообщение..."
            placeholderTextColor={Colors.textDim}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || loading) && styles.sendButtonDisabled]}
            onPress={onSend}
            disabled={loading || !input.trim()}
          >
            <Text style={styles.sendButtonArrow}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={showHistoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowHistoryModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>История чатов</Text>
                  <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={days}
                  keyExtractor={(item) => item.day}
                  style={{ maxHeight: 300 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.modalItem,
                        selectedDay === item.day && styles.modalItemActive,
                      ]}
                      onPress={() => {
                        setSelectedDay(item.day);
                        loadHistoryForDay(item.day);
                        setShowHistoryModal(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.modalItemText,
                          selectedDay === item.day && styles.modalItemTextActive,
                        ]}
                      >
                        {formatDayNice(item.day)}
                      </Text>
                      <View style={styles.modalItemRight}>
                        <Text style={styles.modalItemCount}>{item.count} сообщ.</Text>
                        {selectedDay === item.day && <Text style={styles.modalItemCheck}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTextBlock: {
    flexShrink: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  headerHistoryLink: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  messages: {
    flex: 1,
    marginBottom: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyStateIcon: {
    fontSize: 40,
    marginBottom: 12,
    color: Colors.textDim,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  bubble: {
    marginVertical: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    maxWidth: '85%',
  },
  bubbleUser: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)', // Low opacity primary
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  bubbleModel: {
    backgroundColor: Colors.card,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2, // Darker shadow for dark theme
    shadowRadius: 1,
    elevation: 1,
  },
  textUser: {
    color: Colors.primary, // Text color matches primary
    fontSize: 15,
  },
  textModel: {
    color: Colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
  },
  textUserBold: {
    fontWeight: '700',
    color: Colors.primary,
  },
  textModelBold: {
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  h1: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  h2: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  h3: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  listItem: {
    flexDirection: 'row',
    paddingLeft: 4,
    marginTop: 4,
  },
  bullet: {
    width: 16,
    marginRight: 4,
    color: Colors.textDim,
  },
  listNumber: {
    width: 20,
    marginRight: 4,
    fontWeight: '600',
  },
  listItemText: {
    flex: 1,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputField: {
    flex: 1,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: Colors.textPrimary,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendButtonArrow: {
    color: '#000000', // Black arrow on primary button
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)', // Darker overlay
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '70%',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalClose: {
    fontSize: 24,
    color: Colors.textDim,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  modalItemActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  modalItemText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  modalItemTextActive: {
    fontWeight: '600',
    color: Colors.primary,
  },
  modalItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalItemCount: {
    fontSize: 13,
    color: Colors.textDim,
  },
  modalItemCheck: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: 'bold',
  },
});
