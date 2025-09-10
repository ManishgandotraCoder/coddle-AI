import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { EventUtils } from '../utils/eventUtils';
import { useAppStore } from '../store/appStore';

export const QuickActions: React.FC = () => {
    const currentCaregiverId = useAppStore(state => state.currentCaregiverId);
    const allEvents = useAppStore(state => state.events);

    // Filter and sort events in the component to avoid infinite re-renders
    const events = allEvents
        .filter(event => !event.deleted)
        .sort((a, b) => new Date(b.startISO).getTime() - new Date(a.startISO).getTime());

    const handleQuickFeed = async () => {
        const success = await EventUtils.createFeedingEvent();
        if (success) {
            Alert.alert('Success', 'Feeding event created!');
        }
    };

    const handleQuickDiaper = async () => {
        const success = await EventUtils.createDiaperEvent();
        if (success) {
            Alert.alert('Success', 'Diaper change event created!');
        }
    };

    const handleQuickSleep = async () => {
        const success = await EventUtils.createSleepEvent();
        if (success) {
            Alert.alert('Success', 'Sleep event created!');
        }
    };

    const handleDeleteLastEvent = async () => {
        const lastEvent = events[0]; // Events are sorted by time, newest first
        if (!lastEvent) {
            Alert.alert('No Events', 'There are no events to delete');
            return;
        }

        const success = await EventUtils.deleteEvent(lastEvent.id);
        if (success) {
            Alert.alert('Success', 'Event deleted successfully');
        }
    };

    if (!currentCaregiverId) {
        return null;
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Quick Actions</Text>
            <Text style={styles.subtitle}>Tap for instant event logging</Text>

            <View style={styles.buttonRow}>
                <TouchableOpacity style={[styles.quickButton, styles.feedButton]} onPress={handleQuickFeed}>
                    <Text style={styles.buttonEmoji}>🍼</Text>
                    <Text style={styles.buttonText}>Feed</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.quickButton, styles.diaperButton]} onPress={handleQuickDiaper}>
                    <Text style={styles.buttonEmoji}>👶</Text>
                    <Text style={styles.buttonText}>Diaper</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.quickButton, styles.sleepButton]} onPress={handleQuickSleep}>
                    <Text style={styles.buttonEmoji}>😴</Text>
                    <Text style={styles.buttonText}>Sleep</Text>
                </TouchableOpacity>
            </View>

            {events.length > 0 && (
                <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteLastEvent}>
                    <Text style={styles.deleteButtonText}>🗑️ Delete Last Event</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        marginVertical: 8,
        borderRadius: 12,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 16,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    quickButton: {
        flex: 1,
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    feedButton: {
        backgroundColor: '#dbeafe',
    },
    diaperButton: {
        backgroundColor: '#fef3c7',
    },
    sleepButton: {
        backgroundColor: '#f3e8ff',
    },
    buttonEmoji: {
        fontSize: 24,
        marginBottom: 4,
    },
    buttonText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#374151',
    },
    deleteButton: {
        marginTop: 12,
        padding: 12,
        backgroundColor: '#fee2e2',
        borderRadius: 8,
        alignItems: 'center',
    },
    deleteButtonText: {
        fontSize: 14,
        color: '#dc2626',
        fontWeight: '500',
    },
});
