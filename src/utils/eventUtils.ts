import { Alert } from 'react-native';
import { useAppStore } from '../store/appStore';
import { EventType } from '../types';

/**
 * Utility functions for creating and managing events
 */
export class EventUtils {
    /**
     * Create a new event with validation and error handling
     */
    static async createEvent(type: EventType, notes?: string, startISO?: string, endISO?: string): Promise<boolean> {
        try {
            const store = useAppStore.getState();

            if (!store.currentCaregiverId) {
                Alert.alert('Error', 'Please select a caregiver first');
                return false;
            }

            await store.createEvent(type, notes, startISO, endISO);
            return true;
        } catch (error) {
            console.error('Failed to create event:', error);
            Alert.alert('Error', 'Failed to create event');
            return false;
        }
    }

    /**
     * Delete an event with confirmation and error handling
     */
    static async deleteEvent(eventId: string, showConfirmation: boolean = true): Promise<boolean> {
        try {
            if (showConfirmation) {
                return new Promise((resolve) => {
                    Alert.alert(
                        'Delete Event',
                        'Are you sure you want to delete this event? This action cannot be undone.',
                        [
                            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                            {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: async () => {
                                    try {
                                        await useAppStore.getState().deleteEvent(eventId);
                                        resolve(true);
                                    } catch (error) {
                                        console.error('Failed to delete event:', error);
                                        Alert.alert('Error', 'Failed to delete event');
                                        resolve(false);
                                    }
                                }
                            }
                        ]
                    );
                });
            } else {
                await useAppStore.getState().deleteEvent(eventId);
                return true;
            }
        } catch (error) {
            console.error('Failed to delete event:', error);
            Alert.alert('Error', 'Failed to delete event');
            return false;
        }
    }

    /**
     * Create a quick feeding event
     */
    static async createFeedingEvent(notes?: string): Promise<boolean> {
        return this.createEvent('feed', notes || 'Feeding session');
    }

    /**
     * Create a quick diaper change event
     */
    static async createDiaperEvent(notes?: string): Promise<boolean> {
        return this.createEvent('diaper', notes || 'Diaper change');
    }

    /**
     * Create a quick sleep event
     */
    static async createSleepEvent(notes?: string, startISO?: string, endISO?: string): Promise<boolean> {
        return this.createEvent('sleep', notes || 'Sleep time', startISO, endISO);
    }

    /**
     * Get all visible (non-deleted) events sorted by time
     */
    static getVisibleEvents() {
        const store = useAppStore.getState();
        return store.events
            .filter(event => !event.deleted)
            .sort((a, b) => new Date(b.startISO).getTime() - new Date(a.startISO).getTime());
    }

    /**
     * Get events for a specific caregiver
     */
    static getEventsByCaregiver(caregiverId: string) {
        const events = this.getVisibleEvents();
        return events.filter(event => event.caregiverId === caregiverId);
    }

    /**
     * Get events of a specific type
     */
    static getEventsByType(type: EventType) {
        const events = this.getVisibleEvents();
        return events.filter(event => event.type === type);
    }

    /**
     * Get today's events
     */
    static getTodaysEvents() {
        const events = this.getVisibleEvents();
        const today = new Date().toDateString();
        return events.filter(event => new Date(event.startISO).toDateString() === today);
    }
}

// Export individual functions for convenience
export const {
    createEvent,
    deleteEvent,
    createFeedingEvent,
    createDiaperEvent,
    createSleepEvent,
    getVisibleEvents,
    getEventsByCaregiver,
    getEventsByType,
    getTodaysEvents
} = EventUtils;
