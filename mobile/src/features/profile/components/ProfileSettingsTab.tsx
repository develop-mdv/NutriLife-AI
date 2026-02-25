import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Switch, Platform, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppButton } from '../../../components/AppButton';
import { UserProfileApi, SettingsApi } from '../../../api/me';
import { AppTheme } from '../../../constants/Theme';
import { SleepNotificationType } from '../../../hooks/useNotifications';

interface ProfileSettingsTabProps {
    profile: UserProfileApi;
    setProfile: (p: UserProfileApi) => void;
    settings: SettingsApi;
    setSettings: (s: SettingsApi) => void;
    setHasUnsavedChanges: (val: boolean) => void;
    mode: 'light' | 'dark';
    theme: AppTheme;
    toggleTheme: () => void;
    waterRemindersEnabled: boolean;
    setWaterRemindersEnabled: (val: boolean) => void;
    scheduleOrCancelSleep: (type: SleepNotificationType, enabled: boolean, time: string) => Promise<void>;
    scheduleWaterReminder: (interval: number) => Promise<void>;
    cancelWaterReminders: () => Promise<void>;
    saving: boolean;
    onSaveSettings: () => void;
    styles: any;
}

export const ProfileSettingsTab: React.FC<ProfileSettingsTabProps> = ({
    profile,
    setProfile,
    settings,
    setSettings,
    setHasUnsavedChanges,
    mode,
    theme,
    toggleTheme,
    waterRemindersEnabled,
    setWaterRemindersEnabled,
    scheduleOrCancelSleep,
    scheduleWaterReminder,
    cancelWaterReminders,
    saving,
    onSaveSettings,
    styles,
}) => {
    return (
        <>
            {/* Настройки: базовые данные */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Мои данные</Text>
                <View style={styles.formRow}>
                    <View style={styles.formField}>
                        <Text style={styles.formLabel}>Имя</Text>
                        <TextInput
                            style={styles.input}
                            value={profile.name}
                            onChangeText={(text) => {
                                setProfile({ ...profile, name: text });
                                setHasUnsavedChanges(true);
                            }}
                        />
                    </View>
                </View>
                <View style={styles.formRow}>
                    <View style={styles.formField}>
                        <Text style={styles.formLabel}>Рост (см)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={String(profile.height || '')}
                            onChangeText={(text) => {
                                setProfile({ ...profile, height: Number(text) || 0 });
                                setHasUnsavedChanges(true);
                            }}
                        />
                    </View>
                    <View style={styles.formField}>
                        <Text style={styles.formLabel}>Вес (кг)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={String(profile.weight || '')}
                            onChangeText={(text) => {
                                setProfile({ ...profile, weight: Number(text) || 0 });
                                setHasUnsavedChanges(true);
                            }}
                        />
                    </View>
                </View>
                <View style={styles.formRow}>
                    <View style={styles.formField}>
                        <Text style={styles.formLabel}>Возраст</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={String(profile.age || '')}
                            onChangeText={(text) => {
                                setProfile({ ...profile, age: Number(text) || 0 });
                                setHasUnsavedChanges(true);
                            }}
                        />
                    </View>
                </View>

                <View style={styles.genderSectionRow}>
                    <Text style={styles.formLabel}>Пол</Text>
                    <View style={styles.genderCardsRow}>
                        <TouchableOpacity
                            activeOpacity={0.9}
                            style={[
                                styles.genderCard,
                                (profile.gender === 'male' || !profile.gender) && styles.genderCardSelected,
                            ]}
                            onPress={() => {
                                setProfile({ ...profile, gender: 'male' });
                                setHasUnsavedChanges(true);
                            }}
                        >
                            <View style={styles.genderImageStub}>
                                <Image
                                    source={require('../../../../assets/images/male.png')}
                                    style={styles.genderImage}
                                    resizeMode="contain"
                                />
                            </View>
                            <View style={styles.genderCardFooter}>
                                <Text style={styles.genderLabel}>Мужской</Text>
                                {(profile.gender === 'male' || !profile.gender) && (
                                    <View style={styles.genderCheckBadge}>
                                        <Text style={styles.genderCheckText}>✓</Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            activeOpacity={0.9}
                            style={[
                                styles.genderCard,
                                profile.gender === 'female' && styles.genderCardSelected,
                            ]}
                            onPress={() => {
                                setProfile({ ...profile, gender: 'female' });
                                setHasUnsavedChanges(true);
                            }}
                        >
                            <View style={styles.genderImageStub}>
                                <Image
                                    source={require('../../../../assets/images/female.png')}
                                    style={styles.genderImage}
                                    resizeMode="contain"
                                />
                            </View>
                            <View style={styles.genderCardFooter}>
                                <Text style={styles.genderLabel}>Женский</Text>
                                {profile.gender === 'female' && (
                                    <View style={styles.genderCheckBadge}>
                                        <Text style={styles.genderCheckText}>✓</Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Цели */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Цели</Text>
                <View style={styles.formRow}>
                    <View style={styles.formField}>
                        <Text style={styles.formLabel}>Калории в день</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={String(profile.dailyCalorieGoal || '')}
                            onChangeText={(text) => {
                                setProfile({
                                    ...profile,
                                    dailyCalorieGoal: Number(text) || 0,
                                });
                                setHasUnsavedChanges(true);
                            }}
                        />
                    </View>
                </View>
                <View style={styles.formRow}>
                    <View style={styles.formField}>
                        <Text style={styles.formLabel}>Шаги в день</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={String(profile.dailyStepGoal || '')}
                            onChangeText={(text) => {
                                setProfile({
                                    ...profile,
                                    dailyStepGoal: Number(text) || 0,
                                });
                                setHasUnsavedChanges(true);
                            }}
                        />
                    </View>
                    <View style={styles.formField}>
                        <Text style={styles.formLabel}>Вода (мл/день)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={String(settings.waterGoal || '')}
                            onChangeText={(text) => {
                                setSettings({
                                    ...settings,
                                    waterGoal: Number(text) || 0,
                                });
                                setHasUnsavedChanges(true);
                            }}
                        />
                    </View>
                </View>
            </View>

            {/* Персонализация */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Персонализация</Text>
                <View style={styles.formFieldFull}>
                    <Text style={styles.formLabel}>Аллергии</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        multiline
                        value={profile.allergies || ''}
                        onChangeText={(text) => {
                            setProfile({ ...profile, allergies: text });
                            setHasUnsavedChanges(true);
                        }}
                        placeholder="Орехи, мед..."
                    />
                </View>
                <View style={styles.formFieldFull}>
                    <Text style={styles.formLabel}>Предпочтения</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        multiline
                        value={profile.preferences || ''}
                        onChangeText={(text) => {
                            setProfile({ ...profile, preferences: text });
                            setHasUnsavedChanges(true);
                        }}
                        placeholder="Вегетарианец, люблю острое..."
                    />
                </View>
                <View style={styles.formFieldFull}>
                    <Text style={styles.formLabel}>Здоровье</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        multiline
                        value={profile.healthConditions || ''}
                        onChangeText={(text) => {
                            setProfile({ ...profile, healthConditions: text });
                            setHasUnsavedChanges(true);
                        }}
                        placeholder="Диабет, травма колена..."
                    />
                </View>
            </View>

            {/* Внешний вид */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Внешний вид</Text>
                <View style={styles.switchRow}>
                    {/* Dynamic label and icon: Sun for Light, Moon for Dark */}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 20, marginRight: 8 }}>
                            {mode === 'dark' ? '🌙' : '☀️'}
                        </Text>
                        <Text style={styles.formLabel}>
                            {mode === 'dark' ? 'Темная тема' : 'Светлая тема'}
                        </Text>
                    </View>
                    <Switch
                        value={mode === 'dark'}
                        onValueChange={toggleTheme}
                        trackColor={{ false: theme.colors.surfaceAlt, true: theme.colors.accentNutrition }}
                        thumbColor={Platform.OS === 'ios' ? undefined : '#fff'}
                    />
                </View>
            </View>

            {/* Сон и напоминания */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Сон и напоминания</Text>
                <View style={styles.formRow}>
                    <View style={styles.formField}>
                        <Text style={styles.formLabel}>Цель сна (ч)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={String(settings.sleep.targetHours || '')}
                            onChangeText={(text) => {
                                setSettings({
                                    ...settings,
                                    sleep: {
                                        ...settings.sleep,
                                        targetHours: Number(text) || 0,
                                    },
                                });
                                setHasUnsavedChanges(true);
                            }}
                        />
                    </View>
                </View>
                <View style={styles.formRow}>
                    <View style={styles.formField}>
                        <Text style={styles.formLabel}>Отбой (ч:мм)</Text>
                        <TextInput
                            style={styles.input}
                            value={settings.sleep.bedTime}
                            onChangeText={async (text) => {
                                setSettings({
                                    ...settings,
                                    sleep: { ...settings.sleep, bedTime: text },
                                });
                                setHasUnsavedChanges(true);
                                if (settings.sleep.bedTimeReminderEnabled) {
                                    await scheduleOrCancelSleep('sleep_bed', true, text);
                                }
                            }}
                        />
                    </View>
                    <View style={styles.formField}>
                        <Text style={styles.formLabel}>Подъём (ч:мм)</Text>
                        <TextInput
                            style={styles.input}
                            value={settings.sleep.wakeTime}
                            onChangeText={async (text) => {
                                setSettings({
                                    ...settings,
                                    sleep: { ...settings.sleep, wakeTime: text },
                                });
                                setHasUnsavedChanges(true);
                                if (settings.sleep.wakeAlarmEnabled) {
                                    await scheduleOrCancelSleep('sleep_wake', true, text);
                                }
                            }}
                        />
                    </View>
                </View>
                {/* Напоминания о сне и воде */}
                <View style={styles.switchRow}>
                    <Text style={styles.formLabel}>Напоминать перед сном</Text>
                    <Switch
                        value={settings.sleep.bedTimeReminderEnabled}
                        onValueChange={async (value) => {
                            setSettings({
                                ...settings,
                                sleep: { ...settings.sleep, bedTimeReminderEnabled: value },
                            });
                            await scheduleOrCancelSleep('sleep_bed', value, settings.sleep.bedTime);
                        }}
                    />
                </View>
                <View style={styles.switchRow}>
                    <Text style={styles.formLabel}>Будильник по утрам</Text>
                    <Switch
                        value={settings.sleep.wakeAlarmEnabled}
                        onValueChange={async (value) => {
                            setSettings({
                                ...settings,
                                sleep: { ...settings.sleep, wakeAlarmEnabled: value },
                            });
                            await scheduleOrCancelSleep('sleep_wake', value, settings.sleep.wakeTime);
                        }}
                    />
                </View>
                <View style={styles.switchRow}>
                    <Text style={styles.formLabel}>Оповещения о воде</Text>
                    <Switch
                        value={waterRemindersEnabled}
                        onValueChange={async (value) => {
                            try {
                                if (value) {
                                    await scheduleWaterReminder(120);
                                } else {
                                    await cancelWaterReminders();
                                }
                                setWaterRemindersEnabled(value);
                                await AsyncStorage.setItem('waterRemindersEnabled', value ? 'true' : 'false');
                            } catch (e) {
                                console.log('Ошибка переключения напоминаний о воде (профиль)', e);
                            }
                        }}
                    />
                </View>
            </View>

            <View style={{ marginTop: 8 }}>
                <AppButton
                    title={saving ? 'Сохранение...' : 'Сохранить профиль'}
                    onPress={onSaveSettings}
                    disabled={saving}
                />
            </View>
        </>
    );
};
