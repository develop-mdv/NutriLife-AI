import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Button,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { ChatMessage, sendChatMessage } from '../../api/ai';

export const ChatScreen: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Привет! Я твой ИИ-тренер по питанию, сну и активности. Задай мне вопрос.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const onSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await sendChatMessage(messages, text);
      const reply: ChatMessage = { role: 'model', text: res.data.text };
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Тренер</Text>
        <Text style={styles.subtitle}>Задавай вопросы про питание, сон и активности</Text>
      </View>

      <ScrollView style={styles.messages} contentContainerStyle={{ paddingBottom: 16 }}>
        {messages.map((m, idx) => (
          <View
            key={idx}
            style={[
              styles.bubble,
              m.role === 'user' ? styles.bubbleUser : styles.bubbleModel,
            ]}
          >
            <Text style={m.role === 'user' ? styles.textUser : styles.textModel}>{m.text}</Text>
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
        <Button title="▶" onPress={onSend} disabled={loading} />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
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
    padding: 10,
    borderRadius: 12,
    maxWidth: '80%',
  },
  bubbleUser: {
    backgroundColor: '#4ade80',
    alignSelf: 'flex-end',
  },
  bubbleModel: {
    backgroundColor: '#e5e7eb',
    alignSelf: 'flex-start',
  },
  textUser: {
    color: '#06281e',
  },
  textModel: {
    color: '#111827',
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
