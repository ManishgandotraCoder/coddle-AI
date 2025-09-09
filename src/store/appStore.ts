import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import dayjs from 'dayjs';
import uuid from 'react-native-uuid';
import { AppState, CareEvent, Caregiver, EventType, Operation, ConflictResolution } from '../types';
import { storageService } from '../storage/StorageService';
import { syncEngine } from '../services/SyncEngine';
import { cloudAPI } from '../services/CloudAPI';

interface AppActions {
    // Initialization
    initialize: () => Promise<void>;
    resetApp: () => Promise<void>;

    // Caregiver management
    switchCaregiver: (caregiverId: string) => void;
    addCaregiver: (name: string, deviceId: string) => Promise<void>;

    // Event management
    createEvent: (type: EventType, notes?: string, startISO?: string, endISO?: string) => Promise<void>;
    updateEvent: (eventId: string, updates: Partial<CareEvent>) => Promise<void>;
    deleteEvent: (eventId: string) => Promise<void>;

    // Offline/Online management
    setOfflineMode: (offline: boolean) => void;
    sync: () => Promise<void>;

    // Utility
    getVisibleEvents: () => CareEvent[];
    getPendingOperationsCount: () => Promise<number>;
}

type AppStore = AppState & AppActions;

const DEVICE_ID = uuid.v4() as string;

export const useAppStore = create<AppStore>()(
    subscribeWithSelector((set, get) => ({
        // Initial state
        caregivers: [],
        currentCaregiverId: null,
        events: [],
        pendingOperations: [],
        isOffline: false,
        serverVersion: 0,
        conflictResolutions: [],

        // Actions
        initialize: async () => {
            try {
                await storageService.initializeStorage();
                await cloudAPI.initialize();

                // Load persisted data
                const [
                    caregivers,
                    currentCaregiverId,
                    events,
                    pendingOperations,
                    serverVersion,
                    conflictResolutions,
                ] = await Promise.all([
                    storageService.getCaregivers(),
                    storageService.getCurrentCaregiverId(),
                    storageService.getEvents(),
                    storageService.getPendingOperations(),
                    storageService.getServerVersion(),
                    storageService.getConflictResolutions(),
                ]);

                // Initialize with default caregivers if none exist
                let finalCaregivers = caregivers;
                let finalCurrentCaregiverId = currentCaregiverId;

                if (caregivers.length === 0) {
                    const defaultCaregivers: Caregiver[] = [
                        { id: uuid.v4() as string, name: 'Parent', deviceId: DEVICE_ID },
                        { id: uuid.v4() as string, name: 'Partner', deviceId: DEVICE_ID },
                        { id: uuid.v4() as string, name: 'Nanny', deviceId: DEVICE_ID },
                    ];
                    await storageService.saveCaregivers(defaultCaregivers);
                    finalCaregivers = defaultCaregivers;
                    finalCurrentCaregiverId = defaultCaregivers[0].id;
                    await storageService.saveCurrentCaregiverId(finalCurrentCaregiverId);
                }

                set({
                    caregivers: finalCaregivers,
                    currentCaregiverId: finalCurrentCaregiverId,
                    events,
                    pendingOperations,
                    serverVersion,
                    conflictResolutions,
                });

                console.log('App initialized successfully');
            } catch (error) {
                console.error('Failed to initialize app:', error);
                // Set to a safe default state instead of recursive reset
                set({
                    caregivers: [
                        { id: uuid.v4() as string, name: 'Parent', deviceId: DEVICE_ID },
                        { id: uuid.v4() as string, name: 'Partner', deviceId: DEVICE_ID },
                        { id: uuid.v4() as string, name: 'Nanny', deviceId: DEVICE_ID },
                    ],
                    currentCaregiverId: null,
                    events: [],
                    pendingOperations: [],
                    isOffline: false,
                    serverVersion: 0,
                    conflictResolutions: [],
                });

                // Set the first caregiver as current
                const state = get();
                if (state.caregivers.length > 0) {
                    set({ currentCaregiverId: state.caregivers[0].id });
                }
            }
        },

        resetApp: async () => {
            try {
                await storageService.resetStorage();
                await cloudAPI.reset();
                await syncEngine.clearPendingOperations();

                set({
                    caregivers: [],
                    currentCaregiverId: null,
                    events: [],
                    pendingOperations: [],
                    isOffline: false,
                    serverVersion: 0,
                    conflictResolutions: [],
                });

                console.log('App reset successfully');
            } catch (error) {
                console.error('Failed to reset app:', error);
            }
        },

        switchCaregiver: (caregiverId: string) => {
            const { caregivers } = get();
            const caregiver = caregivers.find(c => c.id === caregiverId);

            if (caregiver) {
                set({ currentCaregiverId: caregiverId });
                storageService.saveCurrentCaregiverId(caregiverId);
            }
        },

        addCaregiver: async (name: string, deviceId: string) => {
            const newCaregiver: Caregiver = {
                id: uuid.v4() as string,
                name,
                deviceId,
            };

            const { caregivers } = get();
            const updatedCaregivers = [...caregivers, newCaregiver];

            set({ caregivers: updatedCaregivers });
            await storageService.saveCaregivers(updatedCaregivers);
        },

        createEvent: async (type: EventType, notes?: string, startISO?: string, endISO?: string) => {
            const { currentCaregiverId, isOffline } = get();

            if (!currentCaregiverId) {
                throw new Error('No caregiver selected');
            }

            const eventId = uuid.v4() as string;
            const now = dayjs().toISOString();

            const newEvent: CareEvent = {
                id: eventId,
                caregiverId: currentCaregiverId,
                type,
                startISO: startISO || now,
                endISO,
                notes,
                version: 1,
                updatedAtISO: now,
                lastModifiedBy: currentCaregiverId,
            };

            const operation: Omit<Operation, 'opId' | 'tsISO'> = {
                actorId: currentCaregiverId,
                kind: 'create',
                entityId: eventId,
                patch: newEvent,
                baseVersion: 0,
            };

            // Queue operation for sync
            const queuedOp = await syncEngine.queueOperation(operation);

            // Apply optimistic update
            await syncEngine.applyOptimisticUpdate(queuedOp);

            // Update local state
            const events = await storageService.getEvents();
            const pendingOps = await storageService.getPendingOperations();
            set({ events, pendingOperations: pendingOps });

            // Sync immediately if online
            if (!isOffline) {
                try {
                    await get().sync();
                } catch (error) {
                    console.warn('Auto-sync failed:', error);
                }
            }
        },

        updateEvent: async (eventId: string, updates: Partial<CareEvent>) => {
            const { currentCaregiverId, isOffline, events } = get();

            if (!currentCaregiverId) {
                throw new Error('No caregiver selected');
            }

            const existingEvent = events.find(e => e.id === eventId);
            if (!existingEvent || existingEvent.deleted) {
                throw new Error('Event not found or deleted');
            }

            const now = dayjs().toISOString();
            const operation: Omit<Operation, 'opId' | 'tsISO'> = {
                actorId: currentCaregiverId,
                kind: 'update',
                entityId: eventId,
                patch: {
                    ...updates,
                    updatedAtISO: now,
                    lastModifiedBy: currentCaregiverId,
                },
                baseVersion: existingEvent.version,
            };

            // Queue operation for sync
            const queuedOp = await syncEngine.queueOperation(operation);

            // Apply optimistic update
            await syncEngine.applyOptimisticUpdate(queuedOp);

            // Update local state
            const updatedEvents = await storageService.getEvents();
            const pendingOps = await storageService.getPendingOperations();
            set({ events: updatedEvents, pendingOperations: pendingOps });

            // Sync immediately if online
            if (!isOffline) {
                try {
                    await get().sync();
                } catch (error) {
                    console.warn('Auto-sync failed:', error);
                }
            }
        },

        deleteEvent: async (eventId: string) => {
            const { currentCaregiverId, isOffline, events } = get();

            if (!currentCaregiverId) {
                throw new Error('No caregiver selected');
            }

            const existingEvent = events.find(e => e.id === eventId);
            if (!existingEvent || existingEvent.deleted) {
                throw new Error('Event not found or already deleted');
            }

            const operation: Omit<Operation, 'opId' | 'tsISO'> = {
                actorId: currentCaregiverId,
                kind: 'delete',
                entityId: eventId,
                baseVersion: existingEvent.version,
            };

            // Queue operation for sync
            const queuedOp = await syncEngine.queueOperation(operation);

            // Apply optimistic update
            await syncEngine.applyOptimisticUpdate(queuedOp);

            // Update local state
            const updatedEvents = await storageService.getEvents();
            const pendingOps = await storageService.getPendingOperations();
            set({ events: updatedEvents, pendingOperations: pendingOps });

            // Sync immediately if online
            if (!isOffline) {
                try {
                    await get().sync();
                } catch (error) {
                    console.warn('Auto-sync failed:', error);
                }
            }
        },

        setOfflineMode: (offline: boolean) => {
            set({ isOffline: offline });

            // If going online, trigger sync
            if (!offline) {
                get().sync().catch(error => {
                    console.warn('Auto-sync on reconnect failed:', error);
                });
            }
        },

        sync: async () => {
            const { isOffline } = get();

            if (isOffline) {
                throw new Error('Cannot sync while offline');
            }

            try {
                const result = await syncEngine.sync();

                // Update local state with sync results
                const [events, pendingOps, conflicts] = await Promise.all([
                    storageService.getEvents(),
                    storageService.getPendingOperations(),
                    storageService.getConflictResolutions(),
                ]);

                set({
                    events,
                    pendingOperations: pendingOps,
                    serverVersion: result.serverVersion,
                    conflictResolutions: conflicts,
                });

                console.log(`Sync completed: ${result.applied.length} operations applied, ${result.conflicts.length} conflicts resolved`);
            } catch (error) {
                console.error('Sync failed:', error);
                throw error;
            }
        },

        getVisibleEvents: () => {
            const { events } = get();
            return events
                .filter(event => !event.deleted)
                .sort((a, b) => dayjs(b.startISO).valueOf() - dayjs(a.startISO).valueOf());
        },

        getPendingOperationsCount: async () => {
            const ops = await storageService.getPendingOperations();
            return ops.length;
        },
    }))
);
