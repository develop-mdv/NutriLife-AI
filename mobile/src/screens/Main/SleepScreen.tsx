import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, TextInput, Alert } from 'react-native';
import { updateSleepToday } from '../../api/me';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainStack';

export type SleepScreenProps = NativeStackScreenProps<MainStackParamList, 'Sleep'>;

export const SleepScreen: React.FC<SleepScreenProps> = ({ navigation }) => {
  const [hours, setHours] = useState('8');
  const [saving, setSaving] = useState(false);

  const setPreset = (h: number) => setHours(String(h));

  const onSave = async () => {
    const h = Number(hours.replace(',', '.'));
    if (isNaN(h) || h <= 0 || h > 24) {
      Alert.alert('Ошибка', 'Введите количество часов от 1 до 24');
      return;
    }
    try {
      setSaving(true);
      await updateSleepToday(h);
      Alert.alert('Готово', 'Данные о сне сохранены');
      navigation.goBack();
    } catch (e) {
      console.log('Ошибка сохранения сна', e);
      Alert.alert('Ошибка', 'Не удалось сохранить данные');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Сон за последнюю ночь</Text>
      <Text style={styles.subtitle}>Сколько часов вы примерно спали?</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Часы сна</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={hours}
          onChangeText={setHours}
        />
        <View style={styles.row}>
          <Button title="6 ч" onPress={() => setPreset(6)} />
          <Button title="7 ч" onPress={() => setPreset(7)} />
          <Button title="8 ч" onPress={() => setPreset(8)} />
        </View>
      </View>

      <Button title={saving ? 'Сохранение...' : 'Сохранить'} onPress={onSave} disabled={saving} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#4b5563',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  label: {
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
    width: 100,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
