import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { CareEvent, Operation, SyncResult, ConflictResolution } from '../types';

dayjs.extend(utc);

interface CloudState {
    events: CareEvent[];
    version: number;
}

/**
 * Mock Cloud API that simulates a server with deterministic conflict resolution.
 * This persists server state locally to enable reproducible testing.
 */
class MockCloudAPI {
    private cloudState: CloudState = {
        events: [],
        version: 0,
    };

    private readonly STORAGE_KEY = 'mock_cloud_state';

    async initialize(): Promise<void> {
        try {
            // Use AsyncStorage for React Native instead of localStorage
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                this.cloudState = JSON.parse(stored);
            }
        } catch (error) {
            console.warn('Failed to load cloud state, starting fresh:', error);
        }
    }

    private async persistState(): Promise<void> {
        try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cloudState));
        } catch (error) {
            console.warn('Failed to persist cloud state:', error);
        }
    }

    /**
     * Apply operations to the cloud state with conflict resolution.
     * Uses Last-Writer-Wins (LWW) with tie-breaking by version, updatedAt, then actorId.
     */
    async apply(operations: Operation[]): Promise<SyncResult> {
        const result: SyncResult = {
            applied: [],
            conflicts: [],
            serverVersion: this.cloudState.version,
        };

        // Process operations in chronological order for determinism
        const sortedOps = [...operations].sort((a, b) => {
            const timeA = dayjs.utc(a.tsISO);
            const timeB = dayjs.utc(b.tsISO);
            if (timeA.isBefore(timeB)) return -1;
            if (timeA.isAfter(timeB)) return 1;
            return a.opId.localeCompare(b.opId); // Tie-break by opId for determinism
        });

        for (const op of sortedOps) {
            // Check for duplicate operations (idempotency)
            if (this.isOperationAlreadyApplied(op)) {
                continue;
            }

            const existingEvent = this.cloudState.events.find(e => e.id === op.entityId);
            let conflict: ConflictResolution | null = null;

            switch (op.kind) {
                case 'create':
                    if (existingEvent) {
                        // Creation conflict - event already exists
                        conflict = {
                            eventId: op.entityId,
                            conflictedFields: ['entire_event'],
                            winner: 'remote',
                            reason: 'Event already exists on server',
                            timestamp: dayjs.utc().toISOString(),
                        };
                    } else if (op.patch) {
                        const newEvent: CareEvent = {
                            ...op.patch as CareEvent,
                            id: op.entityId,
                            version: 1,
                            updatedAtISO: op.tsISO,
                            lastModifiedBy: op.actorId,
                        };
                        this.cloudState.events.push(newEvent);
                        result.applied.push(op);
                        this.cloudState.version++;
                    }
                    break;

                case 'update':
                    if (!existingEvent || existingEvent.deleted) {
                        // Update to non-existent event
                        conflict = {
                            eventId: op.entityId,
                            conflictedFields: ['entire_event'],
                            winner: 'remote',
                            reason: 'Cannot update deleted or non-existent event',
                            timestamp: dayjs.utc().toISOString(),
                        };
                    } else {
                        // Check for version conflicts
                        const hasVersionConflict = op.baseVersion && op.baseVersion < existingEvent.version;

                        if (hasVersionConflict) {
                            // Resolve conflict using LWW policy
                            const opTime = dayjs.utc(op.tsISO);
                            const existingTime = dayjs.utc(existingEvent.updatedAtISO);

                            let winner: 'local' | 'remote' = 'remote';
                            let reason = 'Server version is newer';

                            if (opTime.isAfter(existingTime)) {
                                winner = 'local';
                                reason = 'Local operation is newer';
                            } else if (opTime.isSame(existingTime)) {
                                // Tie-break by version
                                if ((op.patch?.version || 0) > existingEvent.version) {
                                    winner = 'local';
                                    reason = 'Local version is higher';
                                } else if ((op.patch?.version || 0) === existingEvent.version) {
                                    // Final tie-break by actorId
                                    if (op.actorId > existingEvent.lastModifiedBy) {
                                        winner = 'local';
                                        reason = 'Tie-broken by actorId';
                                    }
                                }
                            }

                            conflict = {
                                eventId: op.entityId,
                                conflictedFields: Object.keys(op.patch || {}),
                                winner,
                                reason,
                                timestamp: dayjs.utc().toISOString(),
                            };

                            if (winner === 'local' && op.patch) {
                                // Apply the operation
                                Object.assign(existingEvent, op.patch, {
                                    version: existingEvent.version + 1,
                                    updatedAtISO: op.tsISO,
                                    lastModifiedBy: op.actorId,
                                });
                                result.applied.push(op);
                                this.cloudState.version++;
                            }
                        } else if (op.patch) {
                            // No conflict, apply update
                            Object.assign(existingEvent, op.patch, {
                                version: existingEvent.version + 1,
                                updatedAtISO: op.tsISO,
                                lastModifiedBy: op.actorId,
                            });
                            result.applied.push(op);
                            this.cloudState.version++;
                        }
                    }
                    break;

                case 'delete':
                    if (existingEvent && !existingEvent.deleted) {
                        existingEvent.deleted = true;
                        existingEvent.version++;
                        existingEvent.updatedAtISO = op.tsISO;
                        existingEvent.lastModifiedBy = op.actorId;
                        result.applied.push(op);
                        this.cloudState.version++;
                    } else {
                        conflict = {
                            eventId: op.entityId,
                            conflictedFields: ['deleted'],
                            winner: 'remote',
                            reason: 'Event already deleted or does not exist',
                            timestamp: dayjs.utc().toISOString(),
                        };
                    }
                    break;
            }

            if (conflict) {
                result.conflicts.push(conflict);
            }
        }

        result.serverVersion = this.cloudState.version;
        await this.persistState();
        return result;
    }

    private isOperationAlreadyApplied(op: Operation): boolean {
        // Simple check - in a real system, you'd maintain an applied operations log
        const event = this.cloudState.events.find(e => e.id === op.entityId);
        if (!event) return false;

        // Check if the operation timestamp matches the last update
        return dayjs.utc(event.updatedAtISO).isSame(dayjs.utc(op.tsISO)) &&
            event.lastModifiedBy === op.actorId;
    }

    /**
     * Get the current server state for initial sync
     */
    async getServerState(): Promise<{ events: CareEvent[]; version: number }> {
        return {
            events: this.cloudState.events.filter(e => !e.deleted),
            version: this.cloudState.version,
        };
    }

    /**
     * Reset server state (for testing)
     */
    async reset(): Promise<void> {
        this.cloudState = { events: [], version: 0 };
        await this.persistState();
    }
}

export const cloudAPI = new MockCloudAPI();
