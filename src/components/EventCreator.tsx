import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { useAppStore } from '../store/appStore';
import { EventType } from '../types';

const EVENT_TYPES: { type: EventType; label: string; emoji: string }[] = [
    { type: 'feed', label: 'Feed', emoji: '🍼' },
    { type: 'diaper', label: 'Diaper', emoji: '👶' },
    { type: 'sleep', label: 'Sleep', emoji: '😴' },
];

export const EventCreator: React.FC = () => {
    const [selectedType, setSelectedType] = useState<EventType>('feed');
    const [notes, setNotes] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const currentCaregiverId = useAppStore(state => state.currentCaregiverId);
    const createEvent = useAppStore(state => state.createEvent);

    const handleCreateEvent = async () => {
        if (!currentCaregiverId) {
            Alert.alert('Error', 'Please select a caregiver first');
            return;
        }

        setIsCreating(true);
        try {
            await createEvent(selectedType, notes.trim() || undefined);
            setNotes('');
            Alert.alert('Success', 'Event created successfully');
        } catch (error) {
            console.error('Failed to create event:', error);
            Alert.alert('Error', 'Failed to create event');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Log New Event</Text>

            <View style={styles.typeSelector}>
                {EVENT_TYPES.map(({ type, label, emoji }) => (
                    <TouchableOpacity
                        key={type}
                        style={[
                            styles.typeButton,
                            selectedType === type && styles.selectedTypeButton
                        ]}
                        onPress={() => setSelectedType(type)}
                    >
                        <Text style={styles.typeEmoji}>{emoji}</Text>
                        <Text style={[
                            styles.typeLabel,
                            selectedType === type && styles.selectedTypeLabel
                        ]}>
                            {label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TextInput
                style={styles.notesInput}
                placeholder="Add notes (optional)"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
            />

            <TouchableOpacity
                style={[styles.createButton, isCreating && styles.disabledButton]}
                onPress={handleCreateEvent}
                disabled={isCreating || !currentCaregiverId}
            >
                <Text style={styles.createButtonText}>
                    {isCreating ? 'Creating...' : 'Log Event'}
                </Text>
            </TouchableOpacity>
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
        marginBottom: 16,
    },
    typeSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    typeButton: {
        flex: 1,
        alignItems: 'center',
        padding: 12,
        marginHorizontal: 4,
        borderRadius: 8,
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    selectedTypeButton: {
        backgroundColor: '#eff6ff',
        borderColor: '#3b82f6',
    },
    typeEmoji: {
        fontSize: 24,
        marginBottom: 4,
    },
    typeLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6b7280',
    },
    selectedTypeLabel: {
        color: '#3b82f6',
    },
    notesInput: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        minHeight: 80,
        fontSize: 14,
        backgroundColor: '#f9fafb',
    },
    createButton: {
        backgroundColor: '#10b981',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: '#9ca3af',
    },
    createButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
