import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import uuid from 'react-native-uuid';
import { cloudAPI } from './CloudAPI';
import { storageService } from '../storage/StorageService';
import { CareEvent, Operation, SyncResult, ConflictResolution } from '../types';

dayjs.extend(utc);

interface SyncOptions {
    maxRetries?: number;
    retryDelayMs?: number;
    batchSize?: number;
}

/**
 * Sync Engine handles offline operations queueing and conflict resolution
 */
class SyncEngine {
    private issyncing = false;
    private retryCount = 0;
    private readonly DEFAULT_OPTIONS: Required<SyncOptions> = {
        maxRetries: 3,
        retryDelayMs: 1000,
        batchSize: 50,
    };

    /**
     * Queue an operation for later sync
     */
    async queueOperation(operation: Omit<Operation, 'opId' | 'tsISO'>): Promise<Operation> {
        const op: Operation = {
            ...operation,
            opId: uuid.v4() as string,
            tsISO: dayjs.utc().toISOString(),
        };

        const pending = await storageService.getPendingOperations();
        pending.push(op);
        await storageService.savePendingOperations(pending);

        return op;
    }

    /**
     * Sync all pending operations with exponential backoff and retry logic
     */
    async sync(options: SyncOptions = {}): Promise<SyncResult> {
        if (this.issyncing) {
            throw new Error('Sync already in progress');
        }

        const opts = { ...this.DEFAULT_OPTIONS, ...options };
        this.issyncing = true;
        this.retryCount = 0;

        try {
            return await this.performSync(opts);
        } finally {
            this.issyncing = false;
        }
    }

    private async performSync(options: Required<SyncOptions>): Promise<SyncResult> {
        const pendingOps = await storageService.getPendingOperations();

        if (pendingOps.length === 0) {
            return {
                applied: [],
                conflicts: [],
                serverVersion: await storageService.getServerVersion(),
            };
        }

        try {
            // Process operations in batches
            const batches = this.chunkArray(pendingOps, options.batchSize);
            let allResults: SyncResult = {
                applied: [],
                conflicts: [],
                serverVersion: 0,
            };

            for (const batch of batches) {
                const result = await cloudAPI.apply(batch);
                allResults.applied.push(...result.applied);
                allResults.conflicts.push(...result.conflicts);
                allResults.serverVersion = result.serverVersion;

                // Remove successfully applied operations
                const appliedOpIds = new Set(result.applied.map(op => op.opId));
                const remainingOps = pendingOps.filter(op => !appliedOpIds.has(op.opId));
                await storageService.savePendingOperations(remainingOps);
            }

            // Update server version and conflict resolutions
            await storageService.saveServerVersion(allResults.serverVersion);

            if (allResults.conflicts.length > 0) {
                const existingConflicts = await storageService.getConflictResolutions();
                existingConflicts.push(...allResults.conflicts);
                await storageService.saveConflictResolutions(existingConflicts);
            }

            // Sync server state back to local storage
            await this.syncServerStateToLocal();

            this.retryCount = 0;
            return allResults;

        } catch (error) {
            console.error('Sync failed:', error);

            if (this.retryCount < options.maxRetries) {
                this.retryCount++;
                const delay = options.retryDelayMs * Math.pow(2, this.retryCount - 1);

                console.log(`Retrying sync in ${delay}ms (attempt ${this.retryCount}/${options.maxRetries})`);

                await new Promise(resolve => setTimeout(resolve, delay));
                return this.performSync(options);
            }

            throw error;
        }
    }

    /**
     * Sync server state to local storage (for conflict resolution)
     */
    private async syncServerStateToLocal(): Promise<void> {
        try {
            const serverState = await cloudAPI.getServerState();
            const localEvents = await storageService.getEvents();

            // Merge server events with local events, preferring server state for conflicts
            const mergedEvents = new Map<string, CareEvent>();

            // Add local events first
            localEvents.forEach(event => {
                mergedEvents.set(event.id, event);
            });

            // Override with server events (server wins conflicts)
            serverState.events.forEach(serverEvent => {
                const localEvent = mergedEvents.get(serverEvent.id);

                if (!localEvent || serverEvent.version >= localEvent.version) {
                    mergedEvents.set(serverEvent.id, serverEvent);
                }
            });

            await storageService.saveEvents(Array.from(mergedEvents.values()));
            await storageService.saveServerVersion(serverState.version);

        } catch (error) {
            console.error('Failed to sync server state to local:', error);
        }
    }

    /**
     * Apply optimistic updates locally
     */
    async applyOptimisticUpdate(operation: Operation): Promise<void> {
        const events = await storageService.getEvents();
        let updatedEvents = [...events];

        switch (operation.kind) {
            case 'create':
                if (operation.patch) {
                    const newEvent: CareEvent = {
                        ...operation.patch as CareEvent,
                        id: operation.entityId,
                        version: 1,
                        updatedAtISO: operation.tsISO,
                        lastModifiedBy: operation.actorId,
                    };
                    updatedEvents.push(newEvent);
                }
                break;

            case 'update':
                const updateIndex = updatedEvents.findIndex(e => e.id === operation.entityId);
                if (updateIndex >= 0 && operation.patch) {
                    updatedEvents[updateIndex] = {
                        ...updatedEvents[updateIndex],
                        ...operation.patch,
                        version: updatedEvents[updateIndex].version + 1,
                        updatedAtISO: operation.tsISO,
                        lastModifiedBy: operation.actorId,
                    };
                }
                break;

            case 'delete':
                const deleteIndex = updatedEvents.findIndex(e => e.id === operation.entityId);
                if (deleteIndex >= 0) {
                    updatedEvents[deleteIndex] = {
                        ...updatedEvents[deleteIndex],
                        deleted: true,
                        version: updatedEvents[deleteIndex].version + 1,
                        updatedAtISO: operation.tsISO,
                        lastModifiedBy: operation.actorId,
                    };
                }
                break;
        }

        await storageService.saveEvents(updatedEvents);
    }

    /**
     * Get sync status
     */
    getSyncStatus(): { issyncing: boolean; pendingCount: number } {
        return {
            issyncing: this.issyncing,
            pendingCount: 0, // Will be updated by the store
        };
    }

    /**
     * Clear all pending operations (for testing/reset)
     */
    async clearPendingOperations(): Promise<void> {
        await storageService.savePendingOperations([]);
    }

    private chunkArray<T>(array: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
}

export const syncEngine = new SyncEngine();
