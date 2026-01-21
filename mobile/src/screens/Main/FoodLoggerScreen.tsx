import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { AppButton } from '../../components/AppButton';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainStack';
import { analyzeFoodImage } from '../../api/ai';
import { createFood } from '../../api/food';
import { useTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../constants/Theme';

export type FoodLoggerProps = NativeStackScreenProps<MainStackParamList, 'FoodLogger'>;

type Step = 'capture' | 'analyzing' | 'review';

export const FoodLoggerScreen: React.FC<FoodLoggerProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const [step, setStep] = useState<Step>('capture');
  const [imageUri, setImageUri] = useState<string | undefined>();

  const [name, setName] = useState('');
  const [calories, setCalories] = useState('0');
  const [protein, setProtein] = useState('0');
  const [fat, setFat] = useState('0');
  const [carbs, setCarbs] = useState('0');
  const [rating, setRating] = useState('0');
  const [ratingDescription, setRatingDescription] = useState('');
  const [recommendation, setRecommendation] = useState('');

  const isAnalyzing = step === 'analyzing';

  const startAnalyze = async (asset: ImagePicker.ImagePickerAsset) => {
    setImageUri(asset.uri);
    if (!asset.base64) return;
    try {
      setStep('analyzing');
      const res = await analyzeFoodImage(asset.base64);
      const a = res.data as any;
      setName(a.name || '');
      setCalories(String(Math.round(a.calories || 0)));
      setProtein(String(Math.round(a.protein || 0)));
      setFat(String(Math.round(a.fat || 0)));
      setCarbs(String(Math.round(a.carbs || 0)));
      setRating(String(Math.round(a.rating || 0)));
      setRatingDescription(a.ratingDescription || '');
      setRecommendation(a.recommendation || '');
      setStep('review');
    } catch (e) {
      console.log('Ошибка анализа еды', e);
      Alert.alert('Ошибка', 'Не удалось проанализировать фото');
      setStep('capture');
    }
  };

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Камера', 'Нужно разрешение на использование камеры');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      await startAnalyze(result.assets[0]);
    }
  };

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Галерея', 'Нужно разрешение на доступ к фото');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      await startAnalyze(result.assets[0]);
    }
  };

  const onSave = async () => {
    try {
      const now = Date.now();
      const fullRecommendation = ratingDescription
        ? `${ratingDescription}\n\n${recommendation}`
        : recommendation;

      await createFood({
        name: name || 'Блюдо',
        imageUri,
        calories: Number(calories) || 0,
        protein: Number(protein) || 0,
        fat: Number(fat) || 0,
        carbs: Number(carbs) || 0,
        rating: Number(rating) || 0,
        recommendation: fullRecommendation,
        timestamp: now,
      });
      Alert.alert('Готово', 'Запись о приёме пищи сохранена');
      navigation.goBack();
    } catch (e) {
      console.log('Ошибка сохранения еды', e);
      Alert.alert('Ошибка', 'Не удалось сохранить запись');
    }
  };

  // STEP: analyzing
  if (step === 'analyzing') {
    return (
      <View style={styles.analyzingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accentNutrition} />
        <Text style={styles.analyzingTitle}>Изучаю фото...</Text>
        <Text style={styles.analyzingSubtitle}>ИИ считает калории и оценивает полезность</Text>
        {imageUri && <Image source={{ uri: imageUri }} style={styles.analyzingImage} />}
      </View>
    );
  }

  // STEP: review
  if (step === 'review') {
    return (
      <ScrollView contentContainerStyle={styles.reviewContainer}>
        {imageUri && (
          <View style={styles.previewWrapper}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingBadgeLabel}>Оценка:</Text>
              <Text
                style={[
                  styles.ratingBadgeValue,
                  Number(rating) >= 7
                    ? styles.ratingGood
                    : Number(rating) >= 5
                      ? styles.ratingMedium
                      : styles.ratingBad,
                ]}
              >
                {rating}/10
              </Text>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>Название блюда</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholderTextColor={theme.colors.textMuted}
          />

          <View style={styles.macroRow}>
            <View style={styles.macroCol}>
              <Text style={styles.label}>Калории</Text>
              <TextInput
                style={styles.input}
                value={calories}
                onChangeText={setCalories}
                keyboardType="numeric"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
            <View style={styles.macroCol}>
              <Text style={styles.label}>Белки (г)</Text>
              <TextInput
                style={styles.input}
                value={protein}
                onChangeText={setProtein}
                keyboardType="numeric"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.macroRow}>
            <View style={styles.macroCol}>
              <Text style={styles.label}>Жиры (г)</Text>
              <TextInput
                style={styles.input}
                value={fat}
                onChangeText={setFat}
                keyboardType="numeric"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
            <View style={styles.macroCol}>
              <Text style={styles.label}>Углеводы (г)</Text>
              <TextInput
                style={styles.input}
                value={carbs}
                onChangeText={setCarbs}
                keyboardType="numeric"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
          </View>

          <Text style={styles.label}>Оценка полезности (1–10)</Text>
          <TextInput
            style={styles.input}
            value={rating}
            onChangeText={setRating}
            keyboardType="numeric"
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        {!!ratingDescription && (
          <View style={styles.analysisCard}>
            <Text style={styles.analysisTitle}>Анализ полезности</Text>
            <Text style={styles.analysisText}>{ratingDescription}</Text>
          </View>
        )}

        {!!recommendation && (
          <View style={styles.recommendationCard}>
            <Text style={styles.recommendationTitle}>Совет от ИИ</Text>
            <Text style={styles.recommendationText}>{recommendation}</Text>
          </View>
        )}

        <View style={styles.actionsRow}>
          <AppButton title="Отмена" onPress={() => navigation.goBack()} />
          <View style={{ width: 12 }} />
          <AppButton title="Сохранить запись" onPress={onSave} disabled={!name} />
        </View>
      </ScrollView>
    );
  }

  // STEP: capture
  return (
    <ScrollView contentContainerStyle={styles.captureContainer}>
      <View style={styles.captureHeroIconWrapper}>
        <View style={styles.captureHeroGlow} />
        <View style={styles.captureHeroIconBox}>
          <Text style={styles.captureHeroEmoji}>📸</Text>
        </View>
      </View>

      <View style={styles.captureTextBlock}>
        <Text style={styles.captureTitle}>Что на обед?</Text>
        <Text style={styles.captureSubtitle}>
          Сделайте фото еды или выберите его из галереи. ИИ распознает блюдо, посчитает калории и
          даст совет.
        </Text>
      </View>

      <View style={styles.captureButtons}>
        <AppButton title="Сделать фото" onPress={pickFromCamera} />
        <AppButton title="Выбрать из галереи" onPress={pickFromLibrary} />
        <AppButton title="Вернуться назад" onPress={() => navigation.goBack()} />
      </View>
    </ScrollView>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  captureContainer: {
    flexGrow: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  captureHeroIconWrapper: {
    marginBottom: 24,
  },
  captureHeroGlow: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(16,185,129,0.18)',
    borderRadius: 48,
    transform: [{ scale: 1.4 }],
  },
  captureHeroIconBox: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  captureHeroEmoji: {
    fontSize: 40,
  },
  captureTextBlock: {
    alignItems: 'center',
    marginBottom: 24,
  },
  captureTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  captureSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  captureButtons: {
    width: '100%',
    maxWidth: 320,
    gap: 10,
  },
  analyzingContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  analyzingTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  analyzingSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  analyzingImage: {
    width: 160,
    height: 160,
    borderRadius: 24,
    marginTop: 16,
  },
  reviewContainer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: theme.colors.background,
    minHeight: '100%',
  },
  previewWrapper: {
    height: 220,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#000',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    opacity: 0.9,
  },
  ratingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
  },
  ratingBadgeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginRight: 4,
  },
  ratingBadgeValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  ratingGood: {
    color: '#16a34a', // Keep standard notification colors or update to Neon? Green is fine.
  },
  ratingMedium: {
    color: '#f59e0b',
  },
  ratingBad: {
    color: '#ef4444',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  label: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
    fontSize: 14,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.background,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  macroCol: {
    flex: 1,
  },
  analysisCard: {
    backgroundColor: theme.colors.surface, // Was light green
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  analysisTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: theme.colors.accentNutrition,
  },
  analysisText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  recommendationCard: {
    backgroundColor: theme.colors.surface, // Was light blue
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: theme.colors.accentSystem,
  },
  recommendationText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
});
