import AsyncStorage from '@react-native-async-storage/async-storage';
import { CareEvent, Operation, Caregiver, ConflictResolution } from '../types';

const STORAGE_KEYS = {
    EVENTS: 'care_events',
    OPERATIONS: 'pending_operations',
    CAREGIVERS: 'caregivers',
    CURRENT_CAREGIVER: 'current_caregiver',
    SERVER_VERSION: 'server_version',
    CONFLICT_RESOLUTIONS: 'conflict_resolutions',
    SCHEMA_VERSION: 'schema_version',
} as const;

const CURRENT_SCHEMA_VERSION = 1;

class StorageService {
    async initializeStorage(): Promise<void> {
        try {
            const schemaVersion = await this.getSchemaVersion();
            if (schemaVersion !== CURRENT_SCHEMA_VERSION) {
                await this.migrateSchema(schemaVersion);
            }
        } catch (error) {
            console.error('Storage initialization failed:', error);
            await this.resetStorage();
        }
    }

    private async getSchemaVersion(): Promise<number> {
        const version = await AsyncStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION);
        return version ? parseInt(version, 10) : 0;
    }

    private async migrateSchema(fromVersion: number): Promise<void> {
        console.log(`Migrating schema from version ${fromVersion} to ${CURRENT_SCHEMA_VERSION}`);
        // For now, just reset on schema changes
        await this.resetStorage();
        await AsyncStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, CURRENT_SCHEMA_VERSION.toString());
    }

    async resetStorage(): Promise<void> {
        await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
        await AsyncStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, CURRENT_SCHEMA_VERSION.toString());
    }

    // Events
    async getEvents(): Promise<CareEvent[]> {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEYS.EVENTS);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Failed to get events:', error);
            return [];
        }
    }

    async saveEvents(events: CareEvent[]): Promise<void> {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
        } catch (error) {
            console.error('Failed to save events:', error);
            throw error;
        }
    }

    // Operations
    async getPendingOperations(): Promise<Operation[]> {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEYS.OPERATIONS);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Failed to get pending operations:', error);
            return [];
        }
    }

    async savePendingOperations(operations: Operation[]): Promise<void> {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.OPERATIONS, JSON.stringify(operations));
        } catch (error) {
            console.error('Failed to save pending operations:', error);
            throw error;
        }
    }

    // Caregivers
    async getCaregivers(): Promise<Caregiver[]> {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEYS.CAREGIVERS);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Failed to get caregivers:', error);
            return [];
        }
    }

    async saveCaregivers(caregivers: Caregiver[]): Promise<void> {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.CAREGIVERS, JSON.stringify(caregivers));
        } catch (error) {
            console.error('Failed to save caregivers:', error);
            throw error;
        }
    }

    // Current Caregiver
    async getCurrentCaregiverId(): Promise<string | null> {
        try {
            return await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_CAREGIVER);
        } catch (error) {
            console.error('Failed to get current caregiver:', error);
            return null;
        }
    }

    async saveCurrentCaregiverId(caregiverId: string): Promise<void> {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_CAREGIVER, caregiverId);
        } catch (error) {
            console.error('Failed to save current caregiver:', error);
            throw error;
        }
    }

    // Server Version
    async getServerVersion(): Promise<number> {
        try {
            const version = await AsyncStorage.getItem(STORAGE_KEYS.SERVER_VERSION);
            return version ? parseInt(version, 10) : 0;
        } catch (error) {
            console.error('Failed to get server version:', error);
            return 0;
        }
    }

    async saveServerVersion(version: number): Promise<void> {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.SERVER_VERSION, version.toString());
        } catch (error) {
            console.error('Failed to save server version:', error);
            throw error;
        }
    }

    // Conflict Resolutions
    async getConflictResolutions(): Promise<ConflictResolution[]> {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEYS.CONFLICT_RESOLUTIONS);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Failed to get conflict resolutions:', error);
            return [];
        }
    }

    async saveConflictResolutions(conflicts: ConflictResolution[]): Promise<void> {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.CONFLICT_RESOLUTIONS, JSON.stringify(conflicts));
        } catch (error) {
            console.error('Failed to save conflict resolutions:', error);
            throw error;
        }
    }
}

export const storageService = new StorageService();
