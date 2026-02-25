import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainStack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../constants/Theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppButton } from '../../components/AppButton';
import { AlarmItem } from './AlarmListScreen';
import notifee, { TriggerType, TimestampTrigger, RepeatFrequency } from '@notifee/react-native';

type Props = NativeStackScreenProps<MainStackParamList, 'AlarmEdit'>;

export const AlarmEditScreen: React.FC<Props> = ({ navigation, route }) => {
    const { alarmId } = route.params;
    const { theme } = useTheme();
    const styles = React.useMemo(() => createStyles(theme), [theme]);

    const [hour, setHour] = useState('07');
    const [minute, setMinute] = useState('30');
    const [label, setLabel] = useState('Подъем!');
    const [alarms, setAlarms] = useState<AlarmItem[]>([]);

    useEffect(() => {
        loadAlarms();
    }, []);

    const loadAlarms = async () => {
        try {
            const stored = await AsyncStorage.getItem('user_alarms');
            if (stored) {
                const parsed: AlarmItem[] = JSON.parse(stored);
                setAlarms(parsed);
                if (alarmId) {
                    const current = parsed.find(a => a.id === alarmId);
                    if (current) {
                        setHour(current.hour.toString().padStart(2, '0'));
                        setMinute(current.minute.toString().padStart(2, '0'));
                        setLabel(current.label);
                    }
                }
            }
        } catch (e) {
            console.log('Error loading alarms', e);
        }
    };

    const scheduleNotifeeAlarm = async (alarm: AlarmItem) => {
        // Request permissions (required for iOS and Android 13+)
        await notifee.requestPermission();

        const date = new Date(Date.now());
        date.setHours(alarm.hour);
        date.setMinutes(alarm.minute);
        date.setSeconds(0);

        if (date.getTime() < Date.now()) {
            date.setDate(date.getDate() + 1);
        }

        const trigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: date.getTime(),
            repeatFrequency: RepeatFrequency.DAILY,
        };

        // Create a channel (required for Android)
        const channelId = await notifee.createChannel({
            id: 'alarm',
            name: 'Alarm Channel',
            sound: 'default',
            vibration: true,
            vibrationPattern: [300, 500],
        });

        await notifee.createTriggerNotification(
            {
                id: alarm.id,
                title: 'Будильник',
                body: alarm.label || 'Пора вставать!',
                android: {
                    channelId,
                    pressAction: {
                        id: 'default',
                    },
                    // Full-screen intent for alarms
                    fullScreenAction: {
                        id: 'default',
                    },
                },
            },
            trigger,
        );
    };

    const cancelNotifeeAlarm = async (id: string) => {
        await notifee.cancelNotification(id);
    };

    const onSave = async () => {
        const h = parseInt(hour, 10);
        const m = parseInt(minute, 10);

        if (isNaN(h) || h < 0 || h > 23 || isNaN(m) || m < 0 || m > 59) {
            Alert.alert('Ошибка', 'Введите корректное время');
            return;
        }

        let updatedAlarms = [...alarms];
        let currentAlarm: AlarmItem;

        if (alarmId) {
            const idx = updatedAlarms.findIndex(a => a.id === alarmId);
            if (idx !== -1) {
                updatedAlarms[idx] = { ...updatedAlarms[idx], hour: h, minute: m, label };
                currentAlarm = updatedAlarms[idx];
            } else {
                return;
            }
        } else {
            currentAlarm = {
                id: Date.now().toString(),
                hour: h,
                minute: m,
                enabled: true,
                label,
                days: [0, 1, 2, 3, 4, 5, 6], // Every day by default
            };
            updatedAlarms.push(currentAlarm);
        }

        await AsyncStorage.setItem('user_alarms', JSON.stringify(updatedAlarms));

        // Update native trigger
        if (currentAlarm.enabled) {
            await scheduleNotifeeAlarm(currentAlarm);
        } else {
            await cancelNotifeeAlarm(currentAlarm.id);
        }

        navigation.goBack();
    };

    const onDelete = async () => {
        if (!alarmId) return;
        const updatedAlarms = alarms.filter(a => a.id !== alarmId);
        await AsyncStorage.setItem('user_alarms', JSON.stringify(updatedAlarms));
        await cancelNotifeeAlarm(alarmId);
        navigation.goBack();
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <View style={styles.content}>
                <View style={styles.timeInputRow}>
                    <TextInput
                        style={styles.timeInput}
                        keyboardType="number-pad"
                        maxLength={2}
                        value={hour}
                        onChangeText={setHour}
                        selectTextOnFocus
                    />
                    <Text style={styles.timeSeparator}>:</Text>
                    <TextInput
                        style={styles.timeInput}
                        keyboardType="number-pad"
                        maxLength={2}
                        value={minute}
                        onChangeText={setMinute}
                        selectTextOnFocus
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Название</Text>
                    <TextInput
                        style={styles.input}
                        value={label}
                        onChangeText={setLabel}
                        placeholder="Будильник"
                        placeholderTextColor={theme.colors.textMuted}
                    />
                </View>
            </View>

            <View style={styles.footer}>
                <AppButton title="СОХРАНИТЬ" onPress={onSave} />
                {alarmId && (
                    <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
                        <Text style={styles.deleteText}>Удалить будильник</Text>
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        flex: 1,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 40,
    },
    timeInput: {
        fontSize: 64,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
        fontFamily: 'monospace',
        textAlign: 'center',
        width: 120,
    },
    timeSeparator: {
        fontSize: 64,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        marginHorizontal: 12,
    },
    inputGroup: {
        width: '100%',
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        marginBottom: 8,
    },
    input: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: theme.colors.textPrimary,
    },
    footer: {
        padding: 16,
        paddingBottom: 24,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    deleteButton: {
        marginTop: 16,
        alignItems: 'center',
        padding: 12,
    },
    deleteText: {
        color: '#ef4444',
        fontSize: 16,
        fontWeight: '600',
    }
});
