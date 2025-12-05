import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, Image, TextInput, ActivityIndicator, ScrollView, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainStack';
import { analyzeFoodImage } from '../../api/ai';
import { createFood } from '../../api/food';

export type FoodLoggerProps = NativeStackScreenProps<MainStackParamList, 'FoodLogger'>;

export const FoodLoggerScreen: React.FC<FoodLoggerProps> = ({ navigation }) => {
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [base64, setBase64] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('0');
  const [protein, setProtein] = useState('0');
  const [fat, setFat] = useState('0');
  const [carbs, setCarbs] = useState('0');
  const [rating, setRating] = useState('0');
  const [recommendation, setRecommendation] = useState('');

  const pickImage = async () => {
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
      const asset = result.assets[0];
      setImageUri(asset.uri);
      if (asset.base64) {
        setBase64(asset.base64);
        await analyze(asset.base64);
      }
    }
  };

  const analyze = async (b64: string) => {
    try {
      setLoading(true);
      const res = await analyzeFoodImage(b64);
      const a = res.data;
      setName(a.name);
      setCalories(String(Math.round(a.calories)));
      setProtein(String(Math.round(a.protein)));
      setFat(String(Math.round(a.fat)));
      setCarbs(String(Math.round(a.carbs)));
      setRating(String(Math.round(a.rating)));
      setRecommendation(`${a.ratingDescription}\n\n${a.recommendation}`);
    } catch (e) {
      console.log('Ошибка анализа еды', e);
      Alert.alert('Ошибка', 'Не удалось проанализировать фото');
    } finally {
      setLoading(false);
    }
  };

  const onSave = async () => {
    try {
      const now = Date.now();
      await createFood({
        name: name || 'Блюдо',
        imageUri,
        calories: Number(calories) || 0,
        protein: Number(protein) || 0,
        fat: Number(fat) || 0,
        carbs: Number(carbs) || 0,
        rating: Number(rating) || 0,
        recommendation,
        timestamp: now,
      });
      Alert.alert('Готово', 'Запись о приёме пищи сохранена');
      navigation.goBack();
    } catch (e) {
      console.log('Ошибка сохранения еды', e);
      Alert.alert('Ошибка', 'Не удалось сохранить запись');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Button title="Сделать фото" onPress={pickImage} />

      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.image} />
      )}

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text>Анализируем фото...</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.label}>Название блюда</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />

        <Text style={styles.label}>Калории</Text>
        <TextInput
          style={styles.input}
          value={calories}
          onChangeText={setCalories}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Белки (г)</Text>
        <TextInput
          style={styles.input}
          value={protein}
          onChangeText={setProtein}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Жиры (г)</Text>
        <TextInput
          style={styles.input}
          value={fat}
          onChangeText={setFat}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Углеводы (г)</Text>
        <TextInput
          style={styles.input}
          value={carbs}
          onChangeText={setCarbs}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Оценка полезности (1-10)</Text>
        <TextInput
          style={styles.input}
          value={rating}
          onChangeText={setRating}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Рекомендация</Text>
        <TextInput
          style={[styles.input, { height: 100 }]}
          value={recommendation}
          onChangeText={setRecommendation}
          multiline
        />
      </View>

      <Button title="Сохранить" onPress={onSave} disabled={loading || !name} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  center: {
    alignItems: 'center',
    marginVertical: 16,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginVertical: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
  },
  label: {
    fontWeight: 'bold',
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
});
