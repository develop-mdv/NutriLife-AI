import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { AppButton } from '../../../components/AppButton';
import { UserProfileApi } from '../../../api/me';
import { AppTheme } from '../../../constants/Theme';

interface AvatarPickerModalProps {
    visible: boolean;
    onClose: () => void;
    profile: UserProfileApi | null;
    onPickImage: () => void;
    onRemoveAvatar: () => void;
    onSelectEmoji: (emoji: string) => Promise<void>;
    theme: AppTheme;
    styles: any;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
    visible,
    onClose,
    profile,
    onPickImage,
    onRemoveAvatar,
    onSelectEmoji,
    theme,
    styles,
}) => {
    const emojis = ['🧑‍💻', '🏃‍♂️', '🏃‍♀️', '💪', '🥦', '🧘‍♀️', '🚴‍♂️', '🌞', '👽', '🦄', '😺', '🦊'];

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.planOverlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFillObject}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View style={styles.goalOverlayCard}>
                    <Text style={styles.goalOverlayTitle}>Сменить аватар</Text>
                    <Text style={styles.goalOverlaySubtitle}>Выберите фото или эмодзи</Text>

                    <View style={{ gap: 12, marginTop: 8 }}>
                        <AppButton title="Загрузить фото" onPress={onPickImage} />
                        {profile?.avatarUri && (
                            <TouchableOpacity
                                style={{
                                    paddingVertical: 12,
                                    alignItems: 'center',
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    borderRadius: 16,
                                }}
                                onPress={onRemoveAvatar}
                            >
                                <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 14 }}>
                                    Удалить фото
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 20 }} />

                    <Text style={[styles.goalOverlaySubtitle, { marginBottom: 12, textAlign: 'center' }]}>
                        или выберите эмодзи
                    </Text>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
                        {emojis.map((emoji) => (
                            <TouchableOpacity
                                key={emoji}
                                style={{
                                    width: 48,
                                    height: 48,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 24,
                                    backgroundColor: profile?.avatarEmoji === emoji ? theme.colors.surfaceAlt : 'transparent',
                                    borderWidth: profile?.avatarEmoji === emoji ? 1 : 0,
                                    borderColor: theme.colors.accentNutrition,
                                }}
                                onPress={() => onSelectEmoji(emoji)}
                            >
                                <Text style={{ fontSize: 24 }}>{emoji}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={{ marginTop: 24 }}>
                        <AppButton title="Отмена" onPress={onClose} variant="secondary" />
                    </View>
                </View>
            </View>
        </Modal>
    );
};
