import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Switch, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainStack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../constants/Theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppButton } from '../../components/AppButton';

type Props = NativeStackScreenProps<MainStackParamList, 'AlarmList'>;

export interface AlarmItem {
    id: string;
    hour: number;
    minute: number;
    enabled: boolean;
    label: string;
    days: number[]; // 0=Sunday, 1=Monday...
}

export const AlarmListScreen: React.FC<Props> = ({ navigation }) => {
    const { theme } = useTheme();
    const styles = React.useMemo(() => createStyles(theme), [theme]);
    const [alarms, setAlarms] = useState<AlarmItem[]>([]);

    const loadAlarms = async () => {
        try {
            const stored = await AsyncStorage.getItem('user_alarms');
            if (stored) {
                setAlarms(JSON.parse(stored));
            }
        } catch (e) {
            console.log('Error loading alarms', e);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadAlarms();
        }, [])
    );

    const toggleAlarm = async (id: string) => {
        const updated = alarms.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a);
        setAlarms(updated);
        await AsyncStorage.setItem('user_alarms', JSON.stringify(updated));
        // To implement: real Notifee schedule update based on enabled state
    };

    const renderItem = ({ item }: { item: AlarmItem }) => {
        const timeStr = `${item.hour.toString().padStart(2, '0')}:${item.minute.toString().padStart(2, '0')}`;
        return (
            <TouchableOpacity
                style={styles.alarmCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('AlarmEdit', { alarmId: item.id })}
            >
                <View style={{ flex: 1 }}>
                    <Text style={[styles.alarmTime, !item.enabled && styles.alarmDisabledText]}>{timeStr}</Text>
                    <Text style={styles.alarmLabel}>{item.label || 'Будильник'}</Text>
                </View>
                <Switch
                    value={item.enabled}
                    onValueChange={() => toggleAlarm(item.id)}
                    trackColor={{ false: theme.colors.border, true: theme.colors.accentSleep }}
                    thumbColor={item.enabled ? '#fff' : '#f4f3f4'}
                />
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <FlatList
                data={alarms}
                keyExtractor={a => a.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 16 }}
                ListEmptyComponent={<Text style={styles.emptyText}>Нет установленных будильников</Text>}
            />
            <View style={styles.footer}>
                <AppButton
                    title="ДОБАВИТЬ БУДИЛЬНИК"
                    onPress={() => navigation.navigate('AlarmEdit', {})}
                />
            </View>
        </SafeAreaView>
    );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    alarmCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    alarmTime: {
        fontSize: 32,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        fontFamily: 'monospace',
        marginBottom: 4,
    },
    alarmDisabledText: {
        color: theme.colors.textMuted,
    },
    alarmLabel: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    emptyText: {
        textAlign: 'center',
        color: theme.colors.textMuted,
        marginTop: 40,
        fontSize: 16,
    },
    footer: {
        padding: 16,
        paddingBottom: 24,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    }
});
