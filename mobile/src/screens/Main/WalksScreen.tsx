import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, TextInput, ActivityIndicator, TouchableOpacity } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useTodayStats } from '../../hooks/useTodayStats';
import { getProfile, UserProfileApi } from '../../api/me';
import { suggestWalks, validateWalkAddress, WalkingRouteApi, WalkMode } from '../../api/walks';
import { Colors } from '../../constants/Colors';

interface ProgressBarProps {
  current: number;
  max: number;
  color: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ current, max, color }) => {
  const ratio = max > 0 ? Math.min(current / max, 1) : 0;
  return (
    <View style={styles.progressOuter}>
      <View style={[styles.progressInner, { width: `${ratio * 100}%`, backgroundColor: color }]} />
    </View>
  );
};

export const WalksScreen: React.FC = () => {
  const { stats: today } = useTodayStats();
  const [profile, setProfile] = useState<UserProfileApi | null>(null);
  const [stepGoal, setStepGoal] = useState<number>(10000);

  const [activeTab, setActiveTab] = useState<WalkMode>('nearby');
  const [routes, setRoutes] = useState<WalkingRouteApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);

  const [customAddress, setCustomAddress] = useState('');
  const [addressVerified, setAddressVerified] = useState(false);
  const [verifiedAddress, setVerifiedAddress] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [p, perm] = await Promise.all([
          getProfile().catch(() => null),
          Location.requestForegroundPermissionsAsync(),
        ]);

        if (p && p.data) {
          setProfile(p.data);
          if (p.data.dailyStepGoal && p.data.dailyStepGoal > 0) {
            setStepGoal(p.data.dailyStepGoal);
          }
        }

        if (perm.status !== 'granted') {
          setLocError('Разрешите доступ к геолокации, чтобы подбирать маршруты рядом.');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch (e) {
        console.log('Ошибка геолокации', e);
        setLocError('Не удалось получить местоположение. Маршруты будут построены от центра города.');
      }
    })();
  }, []);

  const stepsNeeded = useMemo(
    () => Math.max(0, stepGoal - (today.steps || 0)),
    [stepGoal, today.steps],
  );

  const approxKm = useMemo(() => (stepsNeeded * 0.7) / 1000, [stepsNeeded]);

  const handleVerifyAddress = async () => {
    if (!customAddress.trim()) return;
    try {
      setIsVerifying(true);
      setVerifiedAddress(null);
      setLocError(null);
      const res = await validateWalkAddress(customAddress);
      const normalized = res.data.address;
      if (normalized) {
        setVerifiedAddress(normalized);
        setAddressVerified(true);
      } else {
        setLocError('Не удалось найти такой адрес. Попробуйте уточнить.');
        setAddressVerified(false);
      }
    } catch (e) {
      console.log('Ошибка валидации адреса (walks)', e);
      setLocError('Ошибка при проверке адреса. Попробуйте ещё раз.');
    } finally {
      setIsVerifying(false);
    }
  };

  const fetchRoutes = async () => {
    if (stepsNeeded <= 0) {
      setLocError('Цель по шагам на сегодня уже выполнена!');
      return;
    }

    setLoading(true);
    setLocError(null);
    setRoutes([]);

    if (activeTab === 'custom_address' && !addressVerified) {
      setLocError('Сначала введите и подтвердите адрес.');
      setLoading(false);
      return;
    }

    try {
      const res = await suggestWalks(stepsNeeded, activeTab, {
        lat: location?.lat ?? null,
        lng: location?.lng ?? null,
        customAddress: verifiedAddress || customAddress || undefined,
      });
      setRoutes(res.data || []);
      if (!res.data || res.data.length === 0) {
        setLocError('Не удалось подобрать маршруты. Попробуйте позже.');
      }
    } catch (e: any) {
      console.log('Ошибка подбора маршрутов (walks) RAW:', e?.message, e?.code);
      if (e?.response) {
        console.log('walks status', e.response.status, e.response.data);
      }
      setLocError('Не удалось подобрать маршруты. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const getYandexLink = (route: WalkingRouteApi) => {
    let startPoint = '';
    if (activeTab === 'custom_address' && verifiedAddress) {
      startPoint = verifiedAddress;
    } else if (location) {
      startPoint = `${location.lat},${location.lng}`;
    }

    const start = encodeURIComponent(startPoint);
    const routeEnd = encodeURIComponent(route.endLocation);

    let rtext = '';

    if (activeTab === 'nearby') {
      const routeStart = encodeURIComponent(route.startLocation);
      rtext = `${start}~${routeStart}~${routeEnd}`;
    } else if (route.isRoundTrip) {
      rtext = `${start}~${routeEnd}~${start}`;
    } else {
      rtext = `${start}~${routeEnd}`;
    }

    return `https://yandex.ru/maps/?rtext=${rtext}&rtt=pd`;
  };

  const getGoogleLink = (route: WalkingRouteApi) => {
    let origin = '';
    if (activeTab === 'custom_address' && verifiedAddress) {
      origin = verifiedAddress;
    } else if (location) {
      origin = `${location.lat},${location.lng}`;
    }

    const destination = route.isRoundTrip ? origin : encodeURIComponent(route.endLocation);

    let waypoints = '';
    if (activeTab === 'nearby') {
      waypoints = encodeURIComponent(route.startLocation);
    } else if (route.isRoundTrip) {
      waypoints = encodeURIComponent(route.endLocation);
    }

    let link = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=walking`;
    if (waypoints) {
      link += `&waypoints=${waypoints}`;
    }
    return link;
  };

  const openUrl = (url: string) => {
    Linking.openURL(url).catch((e) => console.log('Ошибка открытия ссылки для прогулки', e));
  };

  useEffect(() => {
    setAddressVerified(false);
    setVerifiedAddress(null);
    setCustomAddress('');
  }, [activeTab]);

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Прогулки 🚶</Text>
            <Text style={styles.subtitle}>Маршруты для вашей цели</Text>
          </View>
          <View style={styles.headerStepsBox}>
            <Text style={styles.headerStepsValue}>{today.steps}</Text>
            <Text style={styles.headerStepsLabel}>из {stepGoal} шагов</Text>
          </View>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeaderRow}>
            <Text style={styles.progressTitle}>Прогресс цели</Text>
            <Text style={styles.progressPercent}>
              {stepGoal > 0 ? Math.round((today.steps / stepGoal) * 100) : 0}%
            </Text>
          </View>
          <ProgressBar current={today.steps} max={stepGoal} color={Colors.primary} />
          <Text style={styles.progressText}>
            Осталось: <Text style={styles.progressTextBold}>{stepsNeeded > 0 ? stepsNeeded : 0} шагов</Text> (~
            {approxKm.toFixed(1)} км).
          </Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'nearby' && styles.tabButtonActive]}
            onPress={() => setActiveTab('nearby')}
          >
            <Text style={[styles.tabText, activeTab === 'nearby' && styles.tabTextActive]}>Рядом</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'direct' && styles.tabButtonActive]}
            onPress={() => setActiveTab('direct')}
          >
            <Text style={[styles.tabText, activeTab === 'direct' && styles.tabTextActive]}>От меня</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'custom_address' && styles.tabButtonActive]}
            onPress={() => setActiveTab('custom_address')}
          >
            <Text style={[styles.tabText, activeTab === 'custom_address' && styles.tabTextActive]}>От адреса</Text>
          </TouchableOpacity>
        </View>

        {/* Tab-specific info */}
        {activeTab === 'custom_address' && (
          <View style={styles.addressBlock}>
            <View style={styles.addressRow}>
              <TextInput
                style={styles.addressInput}
                placeholder="Введите адрес (дом, офис...)"
                placeholderTextColor={Colors.textDim}
                value={customAddress}
                onChangeText={(text) => {
                  setCustomAddress(text);
                  setAddressVerified(false);
                  setVerifiedAddress(null);
                }}
              />
              <TouchableOpacity
                style={[styles.verifyButton, (!customAddress || isVerifying) && styles.verifyButtonDisabled]}
                activeOpacity={0.8}
                disabled={!customAddress || isVerifying}
                onPress={handleVerifyAddress}
              >
                {isVerifying ? <ActivityIndicator size="small" color={Colors.primary} /> : <Text style={styles.verifyButtonText}>Проверить</Text>}
              </TouchableOpacity>
            </View>
            {verifiedAddress && (
              <View style={styles.addressVerifiedBox}>
                <Text style={styles.addressVerifiedLabel}>Адрес найден:</Text>
                <Text style={styles.addressVerifiedValue}>{verifiedAddress}</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'nearby' && (
          <Text style={styles.modeHint}>ИИ найдёт красивые парки и скверы поблизости, где можно погулять.</Text>
        )}
        {activeTab === 'direct' && (
          <Text style={styles.modeHint}>ИИ проложит маршрут от вашего текущего положения до интересного места и обратно.</Text>
        )}

        <View style={{ marginTop: 8 }}>
          <AppButton
            title={loading ? 'Строю маршруты...' : 'Подобрать прогулку'}
            onPress={fetchRoutes}
            disabled={loading || (activeTab === 'custom_address' && !addressVerified)}
          />
        </View>

        {locError && (
          <View style={styles.warning}>
            <Text style={styles.warningText}>{locError}</Text>
          </View>
        )}

        {loading && !locError && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.loadingText}>
              {activeTab === 'nearby'
                ? 'Ищу парки и зелёные зоны поблизости...'
                : 'Подбираю прогулки под вашу цель...'}
            </Text>
          </View>
        )}

        {!loading && routes.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.routesTitle}>Найденные маршруты</Text>
            {routes.map((route, idx) => (
              <View key={idx} style={styles.routeCard}>
                <View style={styles.routeHeaderRow}>
                  <Text style={styles.routeTitle}>{route.title}</Text>
                  <Text style={styles.routeDistance}>~{route.distanceKm} км</Text>
                </View>

                <View style={styles.routeBadgeRow}>
                  {route.isRoundTrip ? (
                    <Text style={[styles.routeBadge, styles.routeBadgeRound]}>
                      Туда-обратно
                    </Text>
                  ) : (
                    <Text style={[styles.routeBadge, styles.routeBadgeOneWay]}>
                      В одну сторону
                    </Text>
                  )}
                </View>

                <Text style={styles.routeDescription}>{route.description}</Text>

                <View style={styles.routeMetaRow}>
                  <Text style={styles.routeMetaItem}>Старт: {route.startLocation}</Text>
                  {route.endLocation && route.endLocation !== route.startLocation && !route.isRoundTrip && (
                    <Text style={styles.routeMetaItem}>Финиш: {route.endLocation}</Text>
                  )}
                  {route.isRoundTrip && (
                    <Text style={styles.routeMetaItem}>Через: {route.endLocation}</Text>
                  )}
                </View>

                <View style={styles.routeButtonsRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <AppButton title="Яндекс" onPress={() => openUrl(getYandexLink(route))} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppButton title="Google" onPress={() => openUrl(getGoogleLink(route))} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  subtitle: {
    color: Colors.textSecondary,
    marginTop: 2,
    fontSize: 13,
  },
  headerStepsBox: {
    alignItems: 'flex-end',
  },
  headerStepsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  headerStepsLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  progressCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressTitle: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  progressOuter: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#333333', // Dark track
    overflow: 'hidden',
  },
  progressInner: {
    height: '100%',
    borderRadius: 999,
  },
  progressText: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  progressTextBold: {
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.border,
    borderRadius: 999,
    padding: 4,
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 6,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: Colors.card,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textDim,
  },
  tabTextActive: {
    color: Colors.textPrimary,
  },
  addressBlock: {
    marginTop: 8,
    marginBottom: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressInput: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.card,
    marginRight: 8,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  verifyButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.2)', // Primary with opacity
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  addressVerifiedBox: {
    marginTop: 6,
    borderRadius: 12,
    padding: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  addressVerifiedLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  addressVerifiedValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  modeHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 8,
  },
  warning: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.2)', // Red with opacity
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  warningText: {
    color: '#F87171', // Lighter red for dark theme
    fontSize: 12,
  },
  loadingBox: {
    marginTop: 16,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  routesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  routeCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  routeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  routeTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginRight: 8,
  },
  routeDistance: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.info,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  routeBadgeRow: {
    marginTop: 4,
    marginBottom: 4,
  },
  routeBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  routeBadgeRound: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)', // Purple opacity
    color: '#A78BFA',
  },
  routeBadgeOneWay: {
    backgroundColor: Colors.border,
    color: Colors.textSecondary,
  },
  routeDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  routeMetaRow: {
    marginTop: 8,
  },
  routeMetaItem: {
    fontSize: 11,
    color: Colors.textDim,
    marginTop: 2,
  },
  routeButtonsRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
});
