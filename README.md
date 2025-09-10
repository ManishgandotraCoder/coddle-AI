# Coddle AI — Offline‑First Multi‑Caregiver Sync with Conflict Resolution (Expo + TypeScript)

A production‑quality React Native (Expo) mini‑app that lets multiple caregivers (Parent, Partner, Nanny) log baby‑care events fully offline and safely sync/merge when connectivity returns. It demonstrates distributed data modeling, a deterministic sync engine, conflict resolution, optimistic UI, resilience, and mobile UX.


## Quick Start

Prerequisites
- Node.js 18+ and npm 9+
- Xcode (iOS Simulator) and/or Android Studio (Android Emulator), or Expo Go on a device

Install & run
- npm install
- npm run ios  # iOS simulator
- npm run android  # Android emulator
- npm run web  # Web preview (limited)

Other scripts
- npm run start  # Expo dev tools
- npm run typecheck  # TypeScript check

Note: This app uses Expo SDK ~53 and React Native ^0.79.5 per package.json.


## What’s Implemented (Scope)
- Caregiver switching: switch between at least Parent, Partner, Nanny
- Event logging: create/edit/delete 3 event types: feed, diaper, sleep
- Offline mode: in‑app toggle to simulate no network; queue operations while offline
- Sync engine: batches, retries with exponential backoff, idempotent by opId, deterministic ordering
- Activity feed: chronological list with provenance and a MERGED badge when reconciliation occurred
- Conflict demo runner: built‑in flows to reproduce concurrent update and delete‑vs‑update scenarios


## Project Structure
- App.tsx — navigation + app bootstrap
- src/
  - components/
    - CaregiverSelector.tsx, EventCreator.tsx, ActivityFeed.tsx, SyncStatus.tsx, ConflictDemo.tsx
  - screens/
    - HomeScreen.tsx, EventScreen.tsx, ProfileScreen.tsx, SettingsScreen.tsx, ConflictScreen.tsx
  - services/
    - CloudAPI.ts — mock server with deterministic conflict resolution and persisted “server” state
    - SyncEngine.ts — offline queue, batching, retries, optimistic updates, local–server merge
  - storage/
    - StorageService.ts — AsyncStorage persistence (events, ops log, caregivers, server version, conflicts)
  - store/
    - appStore.ts — Zustand state/actions (typed)
  - types/
    - index.ts — shared types (CareEvent, Operation, etc.)


## Data Model (typed)
Event types
- feed | diaper | sleep

CareEvent
- id: UUID
- caregiverId: UUID
- type, startISO, endISO?, notes?
- version: number, updatedAtISO: ISO string, lastModifiedBy: caregiverId/deviceId, deleted?: boolean (tombstone)

Operation (append‑only ops log)
- opId: UUID, tsISO, actorId
- kind: create | update | delete
- entityId: CareEvent.id, patch?: Partial<CareEvent>, baseVersion?: number

See src/types/index.ts for exact definitions.


## Architecture Overview

Storage (local first)
- AsyncStorage keeps:
  - Events (authoritative local snapshot)
  - Pending operations (append‑only queue)
  - Caregivers/current caregiver
  - Server version and conflict resolutions
  - Schema version for migrations (reset on mismatch/corruption)

Mock Cloud Adapter (in‑repo)
- CloudAPI.apply(operations[]) -> { serverVersion, applied[], conflicts[] }
- Cloud “state” is also persisted locally in AsyncStorage (mock server), enabling deterministic replays

Sync Engine
- Queue: all local edits create an Operation and append to pending ops
- Optimistic UI: applyOptimisticUpdate mutates the local snapshot immediately
- On reconnect/sync: batches ops, calls CloudAPI.apply, removes applied ops by opId, persists serverVersion
- Pull: merges server state back to local snapshot (server wins ties on merge‑back)
- Retries: exponential backoff with max retries

State Management
- Zustand store (src/store/appStore.ts) orchestrates UI actions, storage, and sync engine

UI
- SyncStatus card: offline/online toggle, pending ops count, server version, manual “Sync Now”
- CaregiverSelector: switch active caregiver
- EventCreator: quick logging of events
- ActivityFeed: reverse‑chronological list with provenance and MERGED badge; tap to see audit details
- ConflictDemo: one‑tap demo scenarios for concurrent edit and delete‑vs‑update


## Conflict Resolution Policy (documented & implemented)
Policy: Last‑Writer‑Wins (LWW) with deterministic tie‑breakers
1) Compare timestamps: newer tsISO (client wall‑clock; stored as updatedAtISO) wins
2) If equal timestamps: higher version wins
3) If equal version: lexicographically higher actorId wins

Notes
- All operations are processed in chronological order by tsISO, then by opId for deterministic ordering
- baseVersion is used to detect stale writes (concurrent edits). When a conflict is detected, a ConflictResolution object is recorded for UI explainability
- Delete semantics: soft delete via tombstone. Update against missing/deleted records is rejected and recorded as conflict; server keeps deletion authoritative

Where implemented
- Server‑side logic: src/services/CloudAPI.ts (MockCloudAPI.apply)
- Client optimistic updates & queueing: src/services/SyncEngine.ts
- Conflict badges and explainer UI: src/components/ActivityFeed.tsx (detail modal)


## Running the Demo Scenarios (Built‑in)
Navigate
- Launch the app → Home → More Actions → “Resolve Conflicts” (navigates to Conflict screen)

Edit conflict scenario
- Tap “Run Edit Conflict”
  1) App creates an initial event online
  2) Caregiver A goes offline and edits Notes
  3) Caregiver B (simulated remote) edits the same field online
  4) A goes back online → sync runs → conflict resolved per LWW policy
  5) In Activity Feed, the event shows a MERGED badge; tap to view “who won and why”

Delete vs Update race
- Tap “Run Delete Conflict”
  - A goes offline and updates event; B deletes it online
  - On reconnect, the event ends deleted; the activity item reflects the outcome

Seeding data
- In Conflict screen, tap “Seed Test Data” multiple times to quickly populate the feed for performance checks


## Manual Feature Walkthrough
- Offline entry: Toggle “Go Offline” in Sync Status → create/edit/delete events → UI updates instantly; ops count increases
- Reconnect & sync: Toggle “Go Online” → tap “Sync Now” (or autosync) → queued ops flush; serverVersion increments
- Provenance: In Activity Feed, tap an item → see caregiver, version, updatedAt, lastModifiedBy, and any conflict records


## Determinism & Idempotency
- Deterministic ordering: CloudAPI sorts ops by tsISO then opId
- De‑duplication: idempotency via opId and last update check; repeating sync does not re‑apply already applied ops, and applied ops are removed from the queue
- Replayability: mock server state is persisted; you can cold‑start the app and re‑observe the same outcomes for the same op stream


## Performance, Resilience, and Migrations
- Performance target: first paint remains responsive with 200+ events and 100+ queued ops. Use “Seed Test Data” to approach this volume quickly
- Resilience: handles empty state, dense edits, and duplicate ops. Clock skew is handled deterministically by ordering + tie‑breakers (keep within ±5m in tests)
- Migrations: StorageService tracks a schema version; on mismatch or corruption the app shows a reset path and performs a safe reset (see initialize/reset in App.tsx and StorageService)


## How to Reset State (for testing)
- Settings → Reset (or, if initialization fails, accept the reset prompt)
- Programmatically: appStore.resetApp() clears AsyncStorage and the mock cloud


## Known Trade‑offs & Future Improvements
- Idempotency log: server‑side duplicate detection is simplified; a durable applied‑ops index would be stronger
- Clock skew: policy trusts client timestamps; a hybrid vector/lamport or server‑time receipt could reduce skew effects
- Field‑level merges: current policy is whole‑document LWW for conflicting fields; could merge non‑overlapping fields
- Background sync: app exposes manual sync; background periodic sync could be added
- Testing: add unit tests and integration tests; wire up proper ESLint/Prettier configs
- Storage: consider SQLite for scalable queries and partial indexes over ops/event history


## Test Plan (what we verify)
Offline & queueing
- Toggle offline → create/edit/delete 5 events → no crashes; optimistic UI; pending ops count increments

Sync & idempotency
- Go online → queued ops flush; final state matches edits
- Repeat “Sync Now” twice → no duplicates (opId de‑dupe)

Conflict scenario (concurrent edits)
- A offline edits notes="A change"; B online edits notes="B change"
- A reconnects → deterministic winner per LWW policy; MERGED badge visible; detail shows winner/loser and rationale

Delete vs update race
- B deletes Event Y while A (offline) updates it
- On reconnect, Y remains deleted; conflict recorded per policy

Ordering & clock skew
- Apply ops out of order and within ±5m skew → outcome remains deterministic given tsISO and tie‑breakers

Persistence & recovery
- Kill & relaunch: events and server state version persist
- Corrupted store: reset path presented; recovery non‑blocking

Performance
- Seed ~200 events + ~100 ops: first feed paint should remain < ~500ms on a mid‑range simulator


## Screenshots
/Users/ethan/Desktop/Simulator Screenshot - iPhone 16 Pro - 2025-09-10 at 11.47.51.png /Users/ethan/Desktop/Simulator Screenshot - iPhone 16 Pro - 2025-09-10 at 11.48.10.png /Users/ethan/Desktop/Simulator Screenshot - iPhone 16 Pro - 2025-09-10 at 11.48.22.png /Users/ethan/Desktop/Simulator Screenshot - iPhone 16 Pro - 2025-09-10 at 11.48.29.png


## License
For evaluation purposes only.

