import { randomUUID } from 'node:crypto'

import { Context, Data, Effect, Layer, Option } from 'effect'
import { LoroDoc, type VersionVector } from 'loro-crdt'

import { Database } from './database' // Reuse

export class ErrorDiagramNotFound extends Data.TaggedError(
	'ErrorDiagramNotFound',
)<{ message: string }> {}
export class ErrorDiagramAlreadyExists extends Data.TaggedError(
	'ErrorDiagramAlreadyExists',
)<{ message: string }> {}
export class ErrorInvalidPeerId extends Data.TaggedError(
	'ErrorInvalidPeerId',
)<{}> {}

// Helper to generate peer ID from string (reuse from document service)
const generatePeerId = (id: string) => {
	let hash = 0
	for (let i = 0; i < id.length; i++) {
		hash = (hash << 5) - hash + id.charCodeAt(i)
		hash |= 0 // Convert to 32-bit integer
	}
	return Effect.succeed(Math.abs(hash))
}

const make = Effect.gen(function* () {
	const db = yield* Database
	const diagrams = new Map<string, LoroDoc>()
	type DiagramHistoryEntry = {
		id: string
		version: unknown
		timestamp: number
		author: string
		message: string | null
	}

	// Load diagrams from DB on startup (adapt from documents)
	const allDiags = yield* db.execute('SELECT * FROM diagrams')
	for (const row of allDiags.rows) {
		const id = row.id as string
		const snapshot = row.snapshot as Uint8Array
		try {
			const peerId = yield* generatePeerId(id)
			const diag = new LoroDoc()
			diag.setPeerId(peerId)
			diag.import(snapshot)
			diagrams.set(id, diag)
		} catch (_error) {}
	}

	const createDiagram = (
		id: string,
		title: string,
		description: string,
		path: string,
		userId: string,
		initialContent?: Uint8Array,
	) =>
		Effect.if(diagrams.has(id), {
			onTrue: () =>
				Effect.fail(
					new ErrorDiagramAlreadyExists({
						message: `Diagram ${id} already exists`,
					}),
				),
			onFalse: () =>
				Effect.gen(function* () {
					const peerId = yield* generatePeerId(userId)
					const diag = new LoroDoc()
					diag.setPeerId(peerId)

					// If initial content is provided, import it
					if (initialContent) {
						diag.import(initialContent)
					} else {
						// Otherwise create default structure (adapt for diagrams: metadata map + empty movableLists)
						const diagramMap = diag.getMap('diagram')
						diagramMap.set('title', title)
						diagramMap.set('description', description)
						diagramMap.set('createdAt', Date.now())
						diagramMap.set('path', path)

						// Set up movableLists for nodes and edges (matches client schema)
						const nodesList = diag.getMovableList('nodes')
						const edgesList = diag.getMovableList('edges')
						diagramMap.setContainer('nodes', nodesList)
						diagramMap.setContainer('edges', edgesList)
						diag.commit()
					}

					diagrams.set(id, diag)

					// Save initial snapshot
					const initialSnapshot = diag.export({ mode: 'snapshot' })
					yield* db.execute(
						'INSERT INTO diagrams (id, snapshot) VALUES (?, ?)',
						[id, initialSnapshot],
					)
					return diag
				}),
		})

	const getDiagram = (id: string) =>
		Effect.sync(() => Option.fromNullable(diagrams.get(id)))

	const deleteDiagram = (id: string) =>
		Effect.gen(function* () {
			yield* db.execute('DELETE FROM diagrams WHERE id = ?', [id])
			diagrams.delete(id)
		})

	const applyUpdate = (id: string, update: Uint8Array, _userId: string) =>
		Effect.gen(function* () {
			const diagOpt = yield* getDiagram(id)
			if (Option.isNone(diagOpt)) {
				return yield* Effect.fail(
					new ErrorDiagramNotFound({ message: `Diagram ${id} not found` }),
				)
			}
			const diag = diagOpt.value
			diag.import(update)
			diag.commit()

			// Save updated snapshot
			const newSnapshot = diag.export({ mode: 'snapshot' })
			yield* db.execute('UPDATE diagrams SET snapshot = ? WHERE id = ?', [
				newSnapshot,
				id,
			])
		})

	const getUpdates = (id: string, fromVersion?: VersionVector) =>
		Effect.gen(function* () {
			const diagOpt = yield* getDiagram(id)
			if (Option.isNone(diagOpt)) {
				return yield* Effect.fail(
					new ErrorDiagramNotFound({ message: `Diagram ${id} not found` }),
				)
			}
			const diag = diagOpt.value
			return diag.export(
				fromVersion
					? { mode: 'update', from: fromVersion }
					: { mode: 'update' },
			)
		})

	const updateMetadata = (
		id: string,
		title?: string,
		description?: string,
		path?: string,
	) =>
		Effect.gen(function* () {
			const diagOpt = yield* getDiagram(id)
			if (Option.isNone(diagOpt)) {
				return yield* Effect.fail(
					new ErrorDiagramNotFound({ message: `Diagram ${id} not found` }),
				)
			}
			const diag = diagOpt.value
			const diagramMap = diag.getMap('diagram')
			if (title) diagramMap.set('title', title)
			if (description) diagramMap.set('description', description)
			if (path) diagramMap.set('path', path)
			diag.commit()

			// Save updated snapshot
			const newSnapshot = diag.export({ mode: 'snapshot' })
			yield* db.execute('UPDATE diagrams SET snapshot = ? WHERE id = ?', [
				newSnapshot,
				id,
			])
		})

	const listDiagrams = () => Effect.sync(() => Array.from(diagrams.keys()))

	const getHistory = (id: string) =>
		Effect.gen(function* () {
			const rows = yield* Effect.promise(() =>
				db.kysely
					.selectFrom('diagram_history')
					.selectAll()
					.where('diag_id', '=', id)
					.orderBy('timestamp', 'desc')
					.execute(),
			)
			return rows.map<DiagramHistoryEntry>(row => ({
				id: row.version_id,
				version: JSON.parse(row.version),
				timestamp: row.timestamp,
				author: row.author,
				message: row.message,
			}))
		})

	const createSnapshot = (id: string, userId: string, message?: string) =>
		Effect.gen(function* () {
			const diagOpt = yield* getDiagram(id)
			if (Option.isNone(diagOpt)) {
				return yield* Effect.fail(
					new ErrorDiagramNotFound({ message: `Diagram ${id} not found` }),
				)
			}
			const diag = diagOpt.value
			const versionId = randomUUID()
			const versionJson = JSON.stringify(diag.version())
			const timestamp = Date.now()

			yield* Effect.promise(() =>
				db.kysely
					.insertInto('diagram_history')
					.values({
						diag_id: id,
						version_id: versionId,
						version: versionJson,
						timestamp,
						author: userId,
						message: message ?? null,
					})
					.execute(),
			)

			return { versionId, timestamp }
		})

	return {
		createDiagram,
		getDiagram,
		deleteDiagram,
		applyUpdate,
		getUpdates,
		updateMetadata,
		listDiagrams,
		getHistory,
		createSnapshot,
	} as const
})

export class LoroDiagramService extends Context.Tag('LoroDiagramService')<
	LoroDiagramService,
	Effect.Effect.Success<typeof make>
>() {
	static readonly Live = Layer.effect(this, make)
}
