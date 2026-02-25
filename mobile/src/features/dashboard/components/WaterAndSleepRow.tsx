import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ProgressBar } from '../../../components/ProgressBar';
import { useTheme } from '../../../context/ThemeContext';
import { AppTheme } from '../../../constants/Theme';
import { SettingsApi } from '../../../api/me';

interface WaterAndSleepRowProps {
    stats: { water: number; sleepHours: number };
    settings: SettingsApi | null;
    waterRemindersEnabled: boolean;
    onToggleWaterReminders: () => void;
    addWater: (amount: number) => void;
    onManageSleep: () => void;
}

export const WaterAndSleepRow: React.FC<WaterAndSleepRowProps> = ({
    stats,
    settings,
    waterRemindersEnabled,
    onToggleWaterReminders,
    addWater,
    onManageSleep,
}) => {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    // Handle sleep format: sometimes it's "7.5" or "7h 30m". Parsing if necessary, or assuming number.
    // Here stats.sleepHours is rendered directly in dashboard.
    return (
        <View style={styles.rowBetween}>
            {/* Water Card */}
            <View style={[styles.cardSmall, { flex: 1, marginRight: 8 }]}>
                <View style={styles.cardHeaderRowAlt}>
                    <View style={styles.cardTitleRowLeft}>
                        <Text style={styles.cardTitleSmall}>ГИДРАТАЦИЯ</Text>
                    </View>
                    <TouchableOpacity onPress={onToggleWaterReminders}>
                        <Text style={{ fontSize: 18 }}>{waterRemindersEnabled ? '🔔' : '🔕'}</Text>
                    </TouchableOpacity>
                </View>
                <Text style={[styles.statValueBig, { flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail">
                    {stats.water}
                    <Text style={styles.statLabel}> / {(settings?.waterGoal ?? 2000)} ml</Text>
                </Text>
                <View style={{ marginVertical: 8 }}>
                    <ProgressBar
                        current={stats.water}
                        max={settings?.waterGoal ?? 2000}
                        color={theme.colors.accentSystem}
                    />
                </View>
                <View style={styles.row}>
                    <TouchableOpacity style={styles.miniButton} onPress={() => addWater(250)}>
                        <Text style={styles.miniButtonText}>+250</Text>
                    </TouchableOpacity>
                    <View style={{ width: 8 }} />
                    <TouchableOpacity style={styles.miniButton} onPress={() => addWater(500)}>
                        <Text style={styles.miniButtonText}>+500</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Sleep Card */}
            <View style={[styles.cardSmall, { flex: 1, marginLeft: 8 }]}>
                <View style={styles.cardHeaderRowAlt}>
                    <Text style={styles.cardTitleSmall}>ВОССТАНОВЛЕНИЕ</Text>
                    {settings?.sleep.wakeAlarmEnabled && (
                        <Text style={{ color: theme.colors.accentSleep }}>⏰ {settings.sleep.wakeTime}</Text>
                    )}
                </View>
                <Text style={[styles.statValueBig, { flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail">
                    {stats.sleepHours}
                    <Text style={styles.statLabel}> / {settings?.sleep.targetHours ?? 8} hr</Text>
                </Text>
                <View style={{ marginVertical: 8 }}>
                    <ProgressBar
                        current={Number(stats.sleepHours) || 0}
                        max={settings?.sleep.targetHours ?? 8}
                        color={theme.colors.accentSleep}
                    />
                </View>
                <TouchableOpacity
                    style={styles.sleepManageButton}
                    activeOpacity={0.8}
                    onPress={onManageSleep}
                >
                    <Text style={styles.sleepManageText}>Управление сном</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    cardSmall: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    cardHeaderRowAlt: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitleRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardTitleSmall: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        letterSpacing: 1,
    },
    statValueBig: {
        fontSize: 24,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        fontFamily: 'monospace',
    },
    statLabel: {
        fontSize: 12,
        color: theme.colors.textMuted,
        fontWeight: '600',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    miniButton: {
        flex: 1,
        paddingVertical: 6,
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    miniButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.accentSystem,
        fontFamily: 'monospace',
    },
    sleepManageButton: {
        marginTop: 4,
        paddingVertical: 6,
        alignItems: 'center',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(168, 85, 247, 0.3)',
    },
    sleepManageText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.accentSleep,
    },
});
