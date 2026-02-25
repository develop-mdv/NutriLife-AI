import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { AppButton } from '../../../components/AppButton';
import { UserProfileApi } from '../../../api/me';

interface GoalPickerModalProps {
    visible: boolean;
    onClose: () => void;
    profile: UserProfileApi | null;
    onSelectGoal: (goalId: string) => Promise<void>;
    styles: any;
}

export const GoalPickerModal: React.FC<GoalPickerModalProps> = ({
    visible,
    onClose,
    profile,
    onSelectGoal,
    styles,
}) => {
    const goalOptions = [
        { id: 'lose_weight', label: 'Похудение', description: 'Снижение веса с акцентом на дефицит калорий и активность.' },
        { id: 'gain_muscle', label: 'Набор массы', description: 'Умеренный профицит калорий и повышенный белок для роста мышц.' },
        { id: 'maintain', label: 'Поддержание', description: 'Стабильный вес и поддержание текущей формы.' },
    ];

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
                    <Text style={styles.goalOverlayTitle}>Выбор цели</Text>
                    <Text style={styles.goalOverlaySubtitle}>Это поможет скорректировать рекомендации и план.</Text>
                    {goalOptions.map((option) => (
                        <TouchableOpacity
                            key={option.id}
                            style={[
                                styles.goalOptionRow,
                                profile?.goal === option.id && styles.goalOptionRowActive,
                            ]}
                            activeOpacity={0.8}
                            onPress={() => onSelectGoal(option.id)}
                        >
                            <View>
                                <Text style={styles.goalOptionLabel}>{option.label}</Text>
                                <Text style={styles.goalOptionDescription}>{option.description}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                    <View style={{ marginTop: 12 }}>
                        <AppButton title="Закрыть" onPress={onClose} />
                    </View>
                </View>
            </View>
        </Modal>
    );
};
