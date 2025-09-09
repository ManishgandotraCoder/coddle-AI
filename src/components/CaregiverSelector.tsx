import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useAppStore } from '../store/appStore';

export const CaregiverSelector: React.FC = () => {
    const caregivers = useAppStore(state => state.caregivers);
    const currentCaregiverId = useAppStore(state => state.currentCaregiverId);
    const switchCaregiver = useAppStore(state => state.switchCaregiver);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Active Caregiver</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollContainer}>
                {caregivers.map(caregiver => (
                    <TouchableOpacity
                        key={caregiver.id}
                        style={[
                            styles.caregiverButton,
                            currentCaregiverId === caregiver.id && styles.activeCaregiverButton
                        ]}
                        onPress={() => switchCaregiver(caregiver.id)}
                    >
                        <Text style={[
                            styles.caregiverText,
                            currentCaregiverId === caregiver.id && styles.activeCaregiverText
                        ]}>
                            {caregiver.name}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        padding: 16,
        marginVertical: 8,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
    },
    scrollContainer: {
        flexDirection: 'row',
    },
    caregiverButton: {
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    activeCaregiverButton: {
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
    },
    caregiverText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6b7280',
    },
    activeCaregiverText: {
        color: 'white',
    },
});
