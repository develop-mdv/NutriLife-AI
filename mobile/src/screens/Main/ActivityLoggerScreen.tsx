import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainStack';
import { getProfile, getTodayStats, updateTodayStats } from '../../api/me';
import { Colors } from '../../constants/Colors';

export type ActivityLoggerScreenProps = NativeStackScreenProps<
  MainStackParamList,
  'ActivityLogger'
>;

interface ActivityOption {
  id: string;
  label: string;
  met: number;
}

interface IntensityOption {
  id: string;
  label: string;
  factor: number;
}

const ACTIVITIES: ActivityOption[] = [
  { id: 'run', label: 'Бег', met: 9.8 },
  { id: 'walk', label: 'Ходьба', met: 3.5 },
  { id: 'gym', label: 'Тренажерный зал', met: 6.0 },
  { id: 'yoga', label: 'Йога', met: 2.5 },
  { id: 'cycle', label: 'Велосипед', met: 7.5 },
  { id: 'swim', label: 'Плавание', met: 6.0 },
];

const INTENSITIES: IntensityOption[] = [
  { id: 'low', label: 'Легкая', factor: 0.8 },
  { id: 'medium', label: 'Средняя', factor: 1.0 },
  { id: 'high', label: 'Высокая', factor: 1.2 },
];

export const ActivityLoggerScreen: React.FC<ActivityLoggerScreenProps> = ({ navigation }) => {
  const [selectedActivity, setSelectedActivity] = useState<ActivityOption>(ACTIVITIES[0]);
  const [selectedIntensity, setSelectedIntensity] = useState<IntensityOption>(INTENSITIES[1]);
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [calories, setCalories] = useState('0');
  const [weight, setWeight] = useState<number>(70);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const profile = await getProfile();
        if (profile.data?.weight) {
          setWeight(profile.data.weight);
        }
      } catch (e) {
        console.log('Ошибка загрузки профиля для веса', e);
      }
    })();
  }, []);

  useEffect(() => {
    const minutes = Number(durationMinutes) || 0;
    const hours = minutes / 60;
    const calculated = Math.round(
      selectedActivity.met * selectedIntensity.factor * weight * hours,
    );
    setCalories(String(calculated));
  }, [durationMinutes, selectedActivity, selectedIntensity, weight]);

  const caloriesNumber = useMemo(() => Number(calories) || 0, [calories]);

  const onSave = async () => {
    const minutes = Number(durationMinutes);
    if (isNaN(minutes) || minutes <= 0) {
      Alert.alert('Ошибка', 'Введите длительность тренировки в минутах');
      return;
    }

    try {
      setSaving(true);
      const today = await getTodayStats();
      const prev = today.data || {
        date: new Date().toISOString().split('T')[0],
        calories: 0,
        steps: 0,
        water: 0,
        sleepHours: 0,
      };
      await updateTodayStats({ ...prev, calories: prev.calories - caloriesNumber });
      Alert.alert('Готово', 'Активность добавлена и калории обновлены');
      navigation.goBack();
    } catch (e) {
      console.log('Ошибка сохранения активности', e);
      Alert.alert('Ошибка', 'Не удалось сохранить активность');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Добавить активность</Text>
          <Text style={styles.subtitle}>Что вы сегодня делали?</Text>
        </View>

        {/* Список активностей */}
        <View style={styles.activitiesGrid}>
          {ACTIVITIES.map((activity) => (
            <TouchableOpacity
              key={activity.id}
              style={[
                styles.activityButton,
                selectedActivity.id === activity.id && styles.activityButtonActive,
              ]}
              activeOpacity={0.85}
              onPress={() => setSelectedActivity(activity)}
            >
              <Text
                style={[
                  styles.activityButtonText,
                  selectedActivity.id === activity.id && styles.activityButtonTextActive,
                ]}
              >
                {activity.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Интенсивность и длительность */}
        <View style={styles.card}>
          {/* Интенсивность */}
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.label}>Интенсивность</Text>
            <View style={styles.intensityRow}>
              {INTENSITIES.map((intensity) => (
                <TouchableOpacity
                  key={intensity.id}
                  style={[
                    styles.intensityButton,
                    selectedIntensity.id === intensity.id && styles.intensityButtonActive,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => setSelectedIntensity(intensity)}
                >
                  <Text
                    style={[
                      styles.intensityButtonText,
                      selectedIntensity.id === intensity.id && styles.intensityButtonTextActive,
                    ]}
                  >
                    {intensity.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Длительность */}
          <View>
            <Text style={styles.label}>Длительность (мин)</Text>
            <View style={styles.durationRow}>
              <TextInput
                style={styles.durationInput}
                keyboardType="numeric"
                value={durationMinutes}
                onChangeText={setDurationMinutes}
                placeholderTextColor={Colors.textDim}
              />
              <View style={styles.durationPresetsRow}>
                {[20, 30, 45].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={styles.durationPresetButton}
                    activeOpacity={0.85}
                    onPress={() => setDurationMinutes(String(m))}
                  >
                    <Text style={styles.durationPresetText}>{m} мин</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Калории */}
        <View style={styles.caloriesCard}>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.caloriesLabel}>Сожжено (ккал)</Text>
            <TextInput
              style={styles.caloriesInput}
              keyboardType="numeric"
              value={calories}
              onChangeText={setCalories}
              placeholderTextColor="rgba(234, 88, 12, 0.5)"
            />
          </View>
          <View style={styles.caloriesHintBadge}>
            <Text style={styles.caloriesHintText}>Можно редактировать</Text>
          </View>
        </View>

        {/* Кнопки действий */}
        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={[styles.mainButton, styles.cancelButton]}
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Отмена</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mainButton, styles.saveButton]}
            activeOpacity={0.9}
            onPress={onSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Сохраняю...' : 'Добавить'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  activitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  activityButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
    marginBottom: 8,
  },
  activityButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  activityButtonText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  activityButtonTextActive: {
    color: Colors.primary,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  intensityRow: {
    flexDirection: 'row',
    backgroundColor: Colors.background, // Inner background
    borderRadius: 10,
    padding: 2,
    marginTop: 8,
  },
  intensityButton: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  intensityButtonActive: {
    backgroundColor: Colors.card, // Highlighted
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  intensityButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textDim,
  },
  intensityButtonTextActive: {
    color: Colors.textPrimary,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  durationInput: {
    width: 70,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 6,
    paddingHorizontal: 8,
    textAlign: 'center',
    fontWeight: '600',
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    marginRight: 8,
  },
  durationPresetsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  durationPresetButton: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  durationPresetText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  caloriesCard: {
    backgroundColor: 'rgba(234, 88, 12, 0.1)', // Orange tint
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(234, 88, 12, 0.3)',
    marginBottom: 16,
    alignItems: 'center',
    position: 'relative',
  },
  caloriesLabel: {
    fontSize: 13,
    color: Colors.secondary,
    marginBottom: 4,
  },
  caloriesInput: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    minWidth: 80,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(234, 88, 12, 0.3)',
    paddingVertical: 4,
  },
  caloriesHintBadge: {
    position: 'absolute',
    top: 8,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(234, 88, 12, 0.2)',
  },
  caloriesHintText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.secondary,
  },
  buttonsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  mainButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelButton: {
    marginRight: 8,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  saveButton: {
    marginLeft: 8,
    backgroundColor: Colors.primary,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000', // Black text on neon green
  },
});
