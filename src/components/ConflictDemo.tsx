import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import dayjs from 'dayjs';
import uuid from 'react-native-uuid';
import { useAppStore } from '../store/appStore';
import { CareEvent, EventType } from '../types';
import { syncEngine } from '../services/SyncEngine';

/**
 * Component to demonstrate conflict resolution scenarios
 */
export const ConflictDemo: React.FC = () => {
    const [isRunning, setIsRunning] = useState(false);

    const caregivers = useAppStore(state => state.caregivers);
    const events = useAppStore(state => state.events);
    const setOfflineMode = useAppStore(state => state.setOfflineMode);
    const isOffline = useAppStore(state => state.isOffline);
    const sync = useAppStore(state => state.sync);
    const createEvent = useAppStore(state => state.createEvent);
    const updateEvent = useAppStore(state => state.updateEvent);

    const runConflictScenario = async () => {
        if (caregivers.length < 2) {
            Alert.alert('Error', 'Need at least 2 caregivers for conflict demo');
            return;
        }

        setIsRunning(true);

        try {
            const [caregiverA, caregiverB] = caregivers;

            // Step 1: Create an event while online
            Alert.alert('Demo Step 1', 'Creating initial event...');

            // Switch to caregiver A and create event
            useAppStore.getState().switchCaregiver(caregiverA.id);
            await createEvent('feed', 'Initial feeding event');

            // Wait for sync
            if (!isOffline) {
                await sync();
            }

            // Get the created event
            const latestEvents = useAppStore.getState().getVisibleEvents();
            const targetEvent = latestEvents[0];

            if (!targetEvent) {
                throw new Error('Failed to create initial event');
            }

            Alert.alert('Demo Step 2', 'Simulating Caregiver A going offline and making changes...');

            // Step 2: Caregiver A goes offline and makes changes
            setOfflineMode(true);
            await updateEvent(targetEvent.id, { notes: 'Updated by Caregiver A while offline' });

            Alert.alert('Demo Step 3', 'Simulating Caregiver B making concurrent changes online...');

            // Step 3: Simulate Caregiver B making concurrent changes (via direct API)
            // In a real scenario, this would be another device/user
            const conflictingOperation = {
                opId: uuid.v4() as string,
                tsISO: dayjs().add(1, 'second').toISOString(), // Slightly later timestamp
                actorId: caregiverB.id,
                kind: 'update' as const,
                entityId: targetEvent.id,
                patch: {
                    notes: 'Updated by Caregiver B while online',
                    version: targetEvent.version + 1,
                },
                baseVersion: targetEvent.version,
            };

            // Apply the conflicting operation directly to the cloud
            const { cloudAPI } = await import('../services/CloudAPI');
            await cloudAPI.apply([conflictingOperation]);

            Alert.alert('Demo Step 4', 'Caregiver A coming back online and syncing...');

            // Step 4: Caregiver A comes back online and syncs
            setOfflineMode(false);
            await sync();

            Alert.alert(
                'Conflict Demo Complete!',
                'Check the activity feed to see the merged event with conflict resolution badge. Tap the event to see conflict details.',
                [{ text: 'OK' }]
            );

        } catch (error) {
            console.error('Conflict demo failed:', error);
            Alert.alert('Demo Failed', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsRunning(false);
        }
    };

    const runDeleteConflictScenario = async () => {
        if (caregivers.length < 2) {
            Alert.alert('Error', 'Need at least 2 caregivers for conflict demo');
            return;
        }

        setIsRunning(true);

        try {
            const [caregiverA, caregiverB] = caregivers;

            // Create an event first
            useAppStore.getState().switchCaregiver(caregiverA.id);
            await createEvent('diaper', 'Event for delete conflict demo');

            if (!isOffline) {
                await sync();
            }

            const latestEvents = useAppStore.getState().getVisibleEvents();
            const targetEvent = latestEvents[0];

            if (!targetEvent) {
                throw new Error('Failed to create initial event');
            }

            Alert.alert('Delete Conflict Demo', 'Simulating delete vs update conflict...');

            // Caregiver A goes offline and updates
            setOfflineMode(true);
            await updateEvent(targetEvent.id, { notes: 'Updated by A before B deletes it' });

            // Simulate Caregiver B deleting the event (via direct API)
            const deleteOperation = {
                opId: uuid.v4() as string,
                tsISO: dayjs().add(1, 'second').toISOString(),
                actorId: caregiverB.id,
                kind: 'delete' as const,
                entityId: targetEvent.id,
                baseVersion: targetEvent.version,
            };

            const { cloudAPI } = await import('../services/CloudAPI');
            await cloudAPI.apply([deleteOperation]);

            // Caregiver A comes back online
            setOfflineMode(false);
            await sync();

            Alert.alert(
                'Delete Conflict Demo Complete!',
                'The event should now be deleted (server wins delete vs update conflicts). Check the activity feed.',
                [{ text: 'OK' }]
            );

        } catch (error) {
            console.error('Delete conflict demo failed:', error);
            Alert.alert('Demo Failed', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsRunning(false);
        }
    };

    const seedTestData = async () => {
        setIsRunning(true);

        try {
            const eventTypes: EventType[] = ['feed', 'diaper', 'sleep'];
            const sampleNotes = [
                'Quick feeding session',
                'Wet diaper change',
                'Afternoon nap',
                'Late night feeding',
                'Dirty diaper cleanup',
                'Morning sleep',
            ];

            // Create 10 sample events
            for (let i = 0; i < 10; i++) {
                const caregiverId = caregivers[i % caregivers.length].id;
                const eventType = eventTypes[i % eventTypes.length];
                const notes = sampleNotes[i % sampleNotes.length];

                useAppStore.getState().switchCaregiver(caregiverId);
                await createEvent(eventType, notes);

                // Small delay to ensure different timestamps
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            if (!isOffline) {
                await sync();
            }

            Alert.alert('Success', 'Test data created successfully!');
        } catch (error) {
            console.error('Failed to seed test data:', error);
            Alert.alert('Error', 'Failed to create test data');
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Conflict Resolution Demo</Text>
            <Text style={styles.description}>
                Test conflict resolution scenarios to see how the app handles concurrent edits
            </Text>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.button, styles.primaryButton, isRunning && styles.disabledButton]}
                    onPress={runConflictScenario}
                    disabled={isRunning}
                >
                    <Text style={styles.buttonText}>
                        {isRunning ? 'Running...' : 'Run Edit Conflict'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.warningButton, isRunning && styles.disabledButton]}
                    onPress={runDeleteConflictScenario}
                    disabled={isRunning}
                >
                    <Text style={styles.buttonText}>
                        {isRunning ? 'Running...' : 'Run Delete Conflict'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.secondaryButton, isRunning && styles.disabledButton]}
                    onPress={seedTestData}
                    disabled={isRunning}
                >
                    <Text style={styles.buttonText}>
                        {isRunning ? 'Running...' : 'Seed Test Data'}
                    </Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.helpText}>
                💡 Run "Edit Conflict" to see Last-Writer-Wins resolution with provenance tracking
            </Text>
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
        borderLeftWidth: 4,
        borderLeftColor: '#f59e0b',
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 16,
        lineHeight: 20,
    },
    buttonContainer: {
        gap: 8,
        marginBottom: 12,
    },
    button: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 6,
        alignItems: 'center',
    },
    primaryButton: {
        backgroundColor: '#dc2626',
    },
    warningButton: {
        backgroundColor: '#f59e0b',
    },
    secondaryButton: {
        backgroundColor: '#6b7280',
    },
    disabledButton: {
        backgroundColor: '#9ca3af',
    },
    buttonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
    },
    helpText: {
        fontSize: 12,
        color: '#9ca3af',
        fontStyle: 'italic',
    },
});
