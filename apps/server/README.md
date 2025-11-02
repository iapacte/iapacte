# Iapacte Server

This service powers the headless API behind Iapacte.com, a unified, collaborative workspace for agentic AI. It follows a resource-centric model inspired by Google Drive and augments it with real-time collaboration using CRDTs (Loro).

## Core Principles

- **Everything is a File**: A single `File` resource represents all assets. Behavior varies by `mimeType`.
- **Separation of metadata vs content**: `GET /files/{id}` returns metadata, while content is accessed via export endpoints.
- **CRDT-first for collaborative assets**: Flows, docs, and diagrams use Loro's CRDT engine. Binary assets are versioned blobs.
- **Real-time sync**: Live collaboration via WebSocket broadcasting Loro operations; HTTP sync fallback is available.
- **Dual version tracking**: Supports both Version Vectors (for compatibility) and Frontiers (for efficiency).

## Resource Model

- Flow: `mimeType: application/vnd.iapacte.flow+json` (CRDT-backed)
- Document: `mimeType: application/vnd.iapacte.document+json` (CRDT-backed)
- PDF/Image: native (e.g., `application/pdf`) – treated as binary
- Folder: `mimeType: application/vnd.iapacte.folder`

Files are organized via a logical `path` (e.g. `/teams/alpha/flows`). A future iteration may support multiple `parents` like Drive.

## API Overview

The server exposes a single `/files` surface that mirrors Google Drive's unified resource model. Every asset—folders, flows, PDFs—is a `File` whose behavior is keyed off `mimeType`. Metadata and content remain decoupled so clients can cheaply inspect a file without downloading its payload.

### Endpoint Cheatsheet

- `POST /files`
  - Accepts metadata and optional content uploads. `uploadType=multipart` sends JSON metadata plus binary payloads in one request. `uploadType=media` replaces the content only. CRDT-backed files can be created with pure JSON metadata and an optional base64-encoded Loro snapshot. A `resumable` flow will be added for large binaries.

- `GET /files/{fileId}`
  - Returns metadata, including `mimeType`, `parents`, `properties`, and `appProperties`.

- `GET /files/{fileId}/export?mode={mode}`
  - Exports file content in various Loro formats:
    - `mode=snapshot`: Full state with complete history
    - `mode=update&from={version}`: Incremental updates since version
    - `mode=shallow-snapshot&frontiers={frontiers}`: Compact snapshot with truncated history
    - `mode=updates-in-range&spans={spans}`: Specific operation ranges
  - For binary files, returns the stored blob directly.

- `POST /files/{fileId}/import`
  - Imports Loro updates or snapshots. Accepts:
    - `Content-Type: application/vnd.loro.update+binary` for incremental updates
    - `Content-Type: application/vnd.loro.snapshot+binary` for full snapshots
    - `Content-Type: application/vnd.loro.shallow+binary` for shallow snapshots
  - Automatically commits pending operations before applying imports.

- `PATCH /files/{fileId}`
  - Updates metadata only (name, description, `parents`, custom properties).
  - Does NOT update content - use import endpoint for CRDT operations.

- `GET /files`
  - Lists files with filtering by parent, mimeType, or search parameters.

- `DELETE /files/{fileId}`
  - Soft-deletes a file and cascades collaboration sessions.

- `WS /files/{fileId}/sync`
  - Bi-directional channel for real-time Loro operations. Clients stay in sync without polling.

- `POST /files/{fileId}/sync`
  - HTTP fallback for WebSocket sync. Supports batch operation merging.

- `GET /files/{fileId}/versions?format={format}`
  - Returns version information:
    - `format=vector`: Version Vector representation
    - `format=frontiers`: Compact Frontiers representation

- `GET /files/{fileId}/operations`
  - Returns raw operation history for audit and debugging.

- `GET /files/{fileId}/revisions`
  - Enumerates named checkpoints/tags.
  - `GET /files/{fileId}/revisions/{revisionId}?mode=export` fetches the content snapshot.

- `POST /files/{fileId}/revisions`
  - Creates a named revision (think `git tag`) anchored to the current state.

- `POST /files/{fileId}/checkout`
  - Time-travel to a specific version (read-only detached state).
  - Accepts `frontiers` or `versionVector` in request body.

- `POST /files/{fileId}/attach`
  - Returns from detached state to the latest version for editing.

- `POST /files/{fileId}/compact`
  - Creates a shallow snapshot, discarding old history while preserving recent operations.

- `POST /files/{fileId}/execute`
  - Triggers domain-specific execution against the file (e.g., run an agent flow).

## Google Drive Alignment

| Feature | Iapacte API | Google Drive API (v3) | Analysis & Nuances |
| :--- | :--- | :--- | :--- |
| **1. File Creation** | `POST /files` with `uploadType=multipart` for binaries, JSON for CRDT metadata + optional Loro snapshot. | `POST /upload/drive/v3/files` with `uploadType`: <br>- `multipart`: metadata + body in one call.<br>- `resumable`: multi-step resilient uploads.<br>- `media`: raw bytes only. | Same philosophy. We currently ship `multipart` and JSON creation, with `resumable` on the roadmap for large uploads. |
| **2. Metadata vs. Content** | `GET /files/{id}` for metadata, `GET /files/{id}/export` for content with Loro export modes. | `GET /files/{id}` for metadata, `GET /files/{id}?alt=media` for content. | We use Loro's export modes instead of simple media access to support various sync strategies. |
| **3. Content Updates** | CRDT files use `POST /files/{id}/import` with Loro binary formats. Binary files use `POST /files/{id}` with `uploadType=media`. | Binary files are re-uploaded entirely via `PATCH /upload/drive/v3/files/{fileId}`. Google Docs/Sheets updates happen through private collaborative protocols. | Our public Loro import/export endpoints provide an open alternative to Google's private editors. |
| **4. Real-Time Collaboration** | `WS /files/{fileId}/sync` broadcasts Loro operations; HTTP fallback via `POST /files/{fileId}/sync`. | No public RT editing; only webhook-style `files.watch`. | The WebSocket bridge delivers Google Docs-class collaboration using Loro's CRDT engine. |
| **5. Versioning / History** | `GET /files/{id}/versions`, `GET /files/{id}/operations`, named revisions, and time-travel via checkout. | `revisions` resource with automatic snapshots. | Our dual version system (Vectors + Frontiers) and operation history provide granular control. |
| **6. File Organization** | Folders are `mimeType: application/vnd.iapacte.folder`; move by patching `parents`. | Folders are files with `mimeType: application/vnd.google-apps.folder`; location via `parents`. | Perfect alignment—supports multi-parent files and Drive-like shortcuts. |
| **7. Extensible Metadata** | `properties` (shared) and `appProperties` (app-private) for custom fields. | `properties` and `appProperties` already exist. | Adopting the same dual metadata stores so integrations can hang domain data off files safely. |

### Alignment Highlights

- Unified `File` resource with `mimeType` differentiation keeps the surface area small yet expressive.
- Metadata and content are intentionally separated to avoid unnecessary payload downloads.
- Folder semantics mirror Drive's flexible `parents` model.
- Loro's export modes provide flexible sync strategies (full, incremental, shallow).
- Version tracking supports both Version Vectors and compact Frontiers representation.

### Strategic Differentiators

- **Public CRDT Sync:** Real-time collaborative editing through Loro operations (import/export + WebSocket) is our standout capability.
- **Flexible Export Modes:** Support for snapshots, incremental updates, and shallow snapshots enables efficient sync.
- **Time Travel:** Checkout to any version for read-only inspection with detached state management.
- **Execution Hooks:** `/files/{fileId}/execute` turns stored files into runnable workflows.

## Loro Integration Details

### Content Types

- `application/vnd.loro.update+binary` - Incremental Loro updates
- `application/vnd.loro.snapshot+binary` - Full Loro snapshots with history
- `application/vnd.loro.shallow+binary` - Shallow snapshots with truncated history
- `application/vnd.loro.operations+json` - JSON representation of operations (debugging)

### Version Management

Loro uses two complementary version representations:

- **Version Vectors**: Compatible with traditional CRDT systems, grows with peer count
- **Frontiers**: Compact DAG-based representation, more efficient for single versions

### Sync Strategies

1. **Full Sync**: Export/import complete snapshots - simplest but largest
2. **Incremental Sync**: Export updates from a known version - efficient for active collaboration
3. **Shallow Sync**: Export shallow snapshots - best for long-lived documents with extensive history

### Architecture (Server)

- Fastify 5 with WebSocket, CORS, and multipart support
- Effect runtime for env/bootstrap
- Loro CRDT engine for collaborative documents
- In MVP, Loro documents are kept in-memory with periodic snapshots
- Persistence will be added via SQL (Turso) with compaction strategies

## Local Development

1. `pnpm install`
2. Ensure required env vars: `SERVER_HOST`, `SERVER_PORT`, `ALLOWED_ORIGINS`. See `fly.toml` or `Dockerfile` for examples.
3. `pnpm --filter @aipacto/apps-server dev`

## Next Steps

- Deliver `uploadType=resumable` with chunked storage and recovery for large binaries
- Persist Loro snapshots + operation logs in SQL with automatic compaction
- Implement shallow snapshot strategy for long-lived documents
- Introduce `parents` for multi-folder organization; add search/filter
- AuthZ checks per org/workspace hierarchy
- Add cursor/presence layer on top of Loro for awareness features
