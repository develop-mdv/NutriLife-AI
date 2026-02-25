import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { AppButton } from '../../../components/AppButton';
import { AchievementMobile } from './ProfileStatsTab';

interface AchievementModalProps {
    achievement: AchievementMobile | null;
    onClose: () => void;
    styles: any;
}

export const AchievementModal: React.FC<AchievementModalProps> = ({
    achievement,
    onClose,
    styles,
}) => {
    return (
        <Modal
            transparent={true}
            visible={!!achievement}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.planOverlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFillObject}
                    activeOpacity={1}
                    onPress={onClose}
                />
                {achievement && (
                    <View style={styles.achievementOverlayCard}>
                        <Text style={styles.achievementOverlayTitle}>{achievement.title}</Text>
                        <Text style={styles.achievementOverlayIcon}>{achievement.icon}</Text>
                        <Text style={styles.achievementOverlayDescription}>{achievement.description}</Text>
                        {achievement.max > 1 && (
                            <View style={{ marginTop: 12 }}>
                                <Text style={styles.achievementOverlayProgressLabel}>
                                    Прогресс: {achievement.current} / {achievement.max} {achievement.unit}
                                </Text>
                                <View style={styles.achievementProgressBarOuter}>
                                    <View
                                        style={[
                                            styles.achievementProgressBarInner,
                                            { width: `${Math.min((achievement.current / achievement.max) * 100, 100)}%` },
                                        ]}
                                    />
                                </View>
                            </View>
                        )}
                        {achievement.unlocked && (
                            <Text style={styles.achievementOverlayUnlocked}>Достижение уже разблокировано 🎉</Text>
                        )}
                        <View style={{ marginTop: 16 }}>
                            <AppButton title="Закрыть" onPress={onClose} />
                        </View>
                    </View>
                )}
            </View>
        </Modal>
    );
};
