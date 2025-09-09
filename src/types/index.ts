export type EventType = 'feed' | 'diaper' | 'sleep';

export interface Caregiver {
    id: string;          // durable UUID
    name: string;
    deviceId: string;    // mock device identifier
}

export interface CareEvent {
    id: string;                 // durable UUID
    caregiverId: string;
    type: EventType;
    startISO: string;           // ISO timestamp
    endISO?: string;            // optional for instantaneous events
    notes?: string;

    // Sync/merge metadata
    version: number;            // increment on local edit
    updatedAtISO: string;       // wall-clock timestamp
    lastModifiedBy: string;     // caregiverId or deviceId
    deleted?: boolean;          // tombstone for deletes
}

export interface Operation {
    opId: string;               // UUID for de-duplication
    tsISO: string;              // client timestamp
    actorId: string;            // deviceId or caregiverId
    kind: 'create' | 'update' | 'delete';
    entityId: string;           // CareEvent.id
    patch?: Partial<CareEvent>; // for updates
    baseVersion?: number;       // for conflict detection
}

export interface ConflictResolution {
    eventId: string;
    conflictedFields: string[];
    winner: 'local' | 'remote';
    reason: string;
    timestamp: string;
}

export interface SyncResult {
    applied: Operation[];
    conflicts: ConflictResolution[];
    serverVersion: number;
}

export interface AppState {
    caregivers: Caregiver[];
    currentCaregiverId: string | null;
    events: CareEvent[];
    pendingOperations: Operation[];
    isOffline: boolean;
    serverVersion: number;
    conflictResolutions: ConflictResolution[];
}
