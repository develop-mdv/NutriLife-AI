import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, ScrollView, Linking } from 'react-native';
import * as Location from 'expo-location';
import { useTodayStats } from '../../hooks/useTodayStats';

interface SimpleRoute {
  id: string;
  title: string;
  distanceKm: number;
  durationMin: number;
  description: string;
  query: string; // текст для поиска в картах
}

const ROUTES: SimpleRoute[] = [
  {
    id: 'short',
    title: 'Короткая прогулка (20–25 мин)',
    distanceKm: 2,
    durationMin: 25,
    description: 'Лёгкий круг по району: прогуляться до ближайшего парка или сквера и обратно.',
    query: 'парк рядом',
  },
  {
    id: 'medium',
    title: 'Средняя прогулка (40–50 мин)',
    distanceKm: 3.5,
    durationMin: 45,
    description: 'Прогулка в среднем темпе: парк + захватить пару кварталов вдоль тихих улиц.',
    query: 'большой парк рядом',
  },
  {
    id: 'long',
    title: 'Длинная прогулка (60–70 мин)',
    distanceKm: 5,
    durationMin: 65,
    description: 'Маршрут для выходного: дойти до набережной, лесопарка или на длинный круг вокруг района.',
    query: 'набережная или лесопарк рядом',
  },
];

export const WalksScreen: React.FC = () => {
  const { stats: today } = useTodayStats();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocError('Разрешите доступ к геолокации, чтобы подбирать маршруты рядом.');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch (e) {
        console.log('Ошибка геолокации', e);
        setLocError('Не удалось получить местоположение.');
      }
    })();
  }, []);

  const stepsGoal = 10000;
  const remainingSteps = Math.max(0, stepsGoal - (today.steps || 0));
  const approxKm = (remainingSteps * 0.7) / 1000; // 0.7 м на шаг

  const openYandex = (query: string) => {
    const encoded = encodeURIComponent(query);
    let url = `https://yandex.ru/maps/?mode=search&text=${encoded}`;
    if (location) {
      url += `&ll=${location.lng}%2C${location.lat}`;
    }
    Linking.openURL(url).catch((e) => console.log('Ошибка открытия Яндекс.Карт', e));
  };

  const openGoogle = (query: string) => {
    const encoded = encodeURIComponent(query);
    let url = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
    Linking.openURL(url).catch((e) => console.log('Ошибка открытия Google Maps', e));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={styles.title}>Прогулки</Text>
      <Text style={styles.subtitle}>
        Сегодня вы прошли {today.steps} шагов. Цель — {stepsGoal}. Осталось примерно {remainingSteps} шагов
        (~{approxKm.toFixed(1)} км).
      </Text>

      {locError && (
        <View style={styles.warning}>
          <Text style={styles.warningText}>{locError}</Text>
        </View>
      )}

      {ROUTES.map((route) => (
        <View key={route.id} style={styles.card}>
          <Text style={styles.cardTitle}>{route.title}</Text>
          <Text style={styles.meta}>
            ≈ {route.distanceKm} км • {route.durationMin} мин пешком
          </Text>
          <Text style={styles.description}>{route.description}</Text>
          <View style={styles.row}>
            <Button title="Открыть в Яндекс.Картах" onPress={() => openYandex(route.query)} />
          </View>
          <View style={styles.row}>
            <Button title="Открыть в Google Maps" onPress={() => openGoogle(route.query)} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  description: {
    marginBottom: 12,
    color: '#374151',
  },
  row: {
    marginTop: 4,
  },
  warning: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    marginBottom: 16,
  },
  warningText: {
    color: '#b91c1c',
  },
});
