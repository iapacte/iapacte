import { Context, Data, Effect, Layer, Option } from 'effect'
import { LoroDoc } from 'loro-crdt'

export type FileId = string

export type FileKind = 'folder' | 'binary' | 'crdt'

export type FileMetadata = {
	id: FileId
	name: string
	description: string | null
	mimeType: string
	parents: string[]
	properties: Record<string, string>
	appProperties: Record<string, string>
	path: string | null
	createdAt: number
	updatedAt: number
	size: number
	ownerId: string
	kind: FileKind
}

export type CreateFileMetadata = {
	name: string
	description?: string | null
	mimeType: string
	parents?: ReadonlyArray<string>
	properties?: Record<string, string | null | undefined>
	appProperties?: Record<string, string | null | undefined>
	path?: string | null
	contentKind?: FileKind
}

export type UpdateFileMetadata = Partial<
	Omit<
		FileMetadata,
		'id' | 'ownerId' | 'createdAt' | 'kind' | 'size' | 'mimeType'
	>
> & {
	mimeType?: string
	properties?: Record<string, string | null | undefined>
	appProperties?: Record<string, string | null | undefined>
	parents?: ReadonlyArray<string>
}

type FileContent =
	| { kind: 'folder' }
	| { kind: 'binary'; data: Uint8Array }
	| { kind: 'crdt'; doc: LoroDoc }

type FileRecord = {
	metadata: FileMetadata
	content: FileContent
}

type CreateFileInput = {
	id: FileId
	ownerId: string
	metadata: CreateFileMetadata
	content?: Uint8Array
}

export class FileNotFoundError extends Data.TaggedError('FileNotFoundError')<{
	id: string
}> {}

export class FileAlreadyExistsError extends Data.TaggedError(
	'FileAlreadyExistsError',
)<{ id: string }> {}

export class InvalidFileOperationError extends Data.TaggedError(
	'InvalidFileOperationError',
)<{ message: string }> {}

const cloneMetadata = (metadata: FileMetadata): FileMetadata => ({
	...metadata,
	parents: [...metadata.parents],
	properties: { ...metadata.properties },
	appProperties: { ...metadata.appProperties },
	path: metadata.path ?? null,
})

const normalizeProperties = (
	input?: Record<string, string | null | undefined>,
): Record<string, string> => {
	if (!input) {
		return {}
	}
	const result: Record<string, string> = {}
	for (const [key, value] of Object.entries(input)) {
		if (value != null) {
			result[key] = value
		}
	}
	return result
}

const applyPropertyPatch = (
	target: Record<string, string>,
	patch?: Record<string, string | null | undefined>,
) => {
	if (!patch) return
	for (const [key, value] of Object.entries(patch)) {
		if (value == null) {
			delete target[key]
		} else {
			target[key] = value
		}
	}
}

const inferKind = (metadata: CreateFileMetadata, content?: Uint8Array): FileKind => {
	if (metadata.contentKind) {
		return metadata.contentKind
	}

	const lowercaseMime = metadata.mimeType.toLowerCase()

	if (
		lowercaseMime === 'application/vnd.iapacte.folder' ||
		lowercaseMime === 'application/vnd.google-apps.folder'
	) {
		return 'folder'
	}

	if (
		lowercaseMime.endsWith('+json') ||
		lowercaseMime === 'application/json' ||
		lowercaseMime.includes('crdt')
	) {
		return 'crdt'
	}

	if (!content || content.byteLength === 0) {
		// Assume CRDT for zero-sized structured documents unless explicitly binary
		if (
			lowercaseMime.startsWith('application/vnd.iapacte') &&
			(lowercaseMime.includes('flow') ||
				lowercaseMime.includes('document') ||
				lowercaseMime.includes('diagram'))
		) {
			return 'crdt'
		}
	}

	return 'binary'
}

const make = Effect.sync(() => {
	const files = new Map<FileId, FileRecord>()

	const touchMetadata = (record: FileRecord) => {
		record.metadata.updatedAt = Date.now()
	}

	const createFile = ({ id, ownerId, metadata, content }: CreateFileInput) =>
		Effect.try(() => {
			if (files.has(id)) {
				throw new FileAlreadyExistsError({ id })
			}

			const now = Date.now()
			const kind = inferKind(metadata, content)
			const baseMetadata: FileMetadata = {
				id,
				name: metadata.name,
				description:
					metadata.description === undefined ? null : metadata.description,
				mimeType: metadata.mimeType,
				parents: metadata.parents ? [...metadata.parents] : [],
				properties: normalizeProperties(metadata.properties),
				appProperties: normalizeProperties(metadata.appProperties),
				path: metadata.path ?? null,
				createdAt: now,
				updatedAt: now,
				size: 0,
				ownerId,
				kind,
			}

			let record: FileRecord

			switch (kind) {
				case 'folder': {
					record = {
						metadata: baseMetadata,
						content: { kind: 'folder' },
					}
					break
				}
				case 'binary': {
					const data = content ?? new Uint8Array()
					baseMetadata.size = data.byteLength
					record = {
						metadata: baseMetadata,
						content: { kind: 'binary', data },
					}
					break
				}
				case 'crdt': {
					const doc = new LoroDoc()
					if (content && content.byteLength > 0) {
						doc.import(content)
					} else {
						// Initialize empty document with metadata container
						const root = doc.getMap('metadata')
						root.set('name', baseMetadata.name)
						root.set('mimeType', baseMetadata.mimeType)
						root.set('createdAt', now)
						doc.commit()
					}
					const snapshot = doc.export({ mode: 'snapshot' })
					baseMetadata.size = snapshot.byteLength
					record = {
						metadata: baseMetadata,
						content: { kind: 'crdt', doc },
					}
					break
				}
				default: {
					throw new InvalidFileOperationError({
						message: 'Unsupported file kind',
					})
				}
			}

			files.set(id, record)

			return cloneMetadata(record.metadata)
		})

	const getRecord = (id: FileId) =>
		Effect.sync(() => Option.fromNullable(files.get(id)))

	const getMetadata = (id: FileId) =>
		getRecord(id).pipe(
			Effect.map(opt =>
				Option.map(opt, record => cloneMetadata(record.metadata)),
			),
		)

	const listFiles = (filters?: { parent?: string; mimeType?: string }) =>
		Effect.sync(() => {
			const result: FileMetadata[] = []
			for (const record of files.values()) {
				if (filters?.parent && !record.metadata.parents.includes(filters.parent)) {
					continue
				}
				if (
					filters?.mimeType &&
					record.metadata.mimeType.toLowerCase() !== filters.mimeType.toLowerCase()
				) {
					continue
				}
				result.push(cloneMetadata(record.metadata))
			}
			return result
		})

	const deleteFile = (id: FileId) =>
		Effect.try(() => {
			if (!files.delete(id)) {
				throw new FileNotFoundError({ id })
			}
		})

	const updateMetadata = (id: FileId, patch: UpdateFileMetadata) =>
		Effect.try(() => {
			const record = files.get(id)
			if (!record) {
				throw new FileNotFoundError({ id })
			}
			let hasChanges = false
			if (patch.name && patch.name !== record.metadata.name) {
				record.metadata.name = patch.name
				hasChanges = true
			}
			if (patch.description !== undefined) {
				record.metadata.description = patch.description
				hasChanges = true
			}
			if (patch.path !== undefined) {
				record.metadata.path = patch.path
				hasChanges = true
			}
			if (patch.parents) {
				record.metadata.parents = [...patch.parents]
				hasChanges = true
			}
			if (patch.mimeType && patch.mimeType !== record.metadata.mimeType) {
				record.metadata.mimeType = patch.mimeType
				hasChanges = true
			}
			if (patch.properties) {
				applyPropertyPatch(record.metadata.properties, patch.properties)
				hasChanges = true
			}
			if (patch.appProperties) {
				applyPropertyPatch(record.metadata.appProperties, patch.appProperties)
				hasChanges = true
			}
			if (hasChanges) {
				touchMetadata(record)
			}
			return cloneMetadata(record.metadata)
		})

	const replaceBinaryContent = (id: FileId, data: Uint8Array) =>
		Effect.try(() => {
			const record = files.get(id)
			if (!record) {
				throw new FileNotFoundError({ id })
			}
			if (record.content.kind !== 'binary') {
				throw new InvalidFileOperationError({
					message: 'Cannot replace binary content on non-binary file',
				})
			}
			record.content.data = data
			record.metadata.size = data.byteLength
			touchMetadata(record)
		})

	const readBinaryContent = (id: FileId) =>
		Effect.try(() => {
			const record = files.get(id)
			if (!record) {
				throw new FileNotFoundError({ id })
			}
			if (record.content.kind !== 'binary') {
				throw new InvalidFileOperationError({
					message: 'Binary content requested from non-binary file',
				})
			}
			return record.content.data
		})

	const exportCrdtSnapshot = (id: FileId) =>
		Effect.try(() => {
			const record = files.get(id)
			if (!record) {
				throw new FileNotFoundError({ id })
			}
			if (record.content.kind !== 'crdt') {
				throw new InvalidFileOperationError({
					message: 'Snapshot requested from non-CRDT file',
				})
			}
			return record.content.doc.export({ mode: 'snapshot' })
		})

	const exportCrdtUpdate = (id: FileId) =>
		Effect.try(() => {
			const record = files.get(id)
			if (!record) {
				throw new FileNotFoundError({ id })
			}
			if (record.content.kind !== 'crdt') {
				throw new InvalidFileOperationError({
					message: 'Update requested from non-CRDT file',
				})
			}
			return record.content.doc.export({ mode: 'update' })
		})

	const applyCrdtUpdate = (id: FileId, update: Uint8Array) =>
		Effect.try(() => {
			const record = files.get(id)
			if (!record) {
				throw new FileNotFoundError({ id })
			}
			if (record.content.kind !== 'crdt') {
				throw new InvalidFileOperationError({
					message: 'Cannot apply CRDT update to non-CRDT file',
				})
			}
			record.content.doc.import(update)
			const snapshot = record.content.doc.export({ mode: 'snapshot' })
			record.metadata.size = snapshot.byteLength
			touchMetadata(record)
		})

	const getCrdtDocument = (id: FileId) =>
		Effect.try(() => {
			const record = files.get(id)
			if (!record) {
				throw new FileNotFoundError({ id })
			}
			if (record.content.kind !== 'crdt') {
				throw new InvalidFileOperationError({
					message: 'CRDT document requested from non-CRDT file',
				})
			}
			return record.content.doc
		})

	return {
		createFile,
		getMetadata,
		listFiles,
		deleteFile,
		updateMetadata,
		replaceBinaryContent,
		readBinaryContent,
		exportCrdtSnapshot,
		exportCrdtUpdate,
		applyCrdtUpdate,
		getCrdtDocument,
		getRecord,
	} as const
})

export class FileService extends Context.Tag('FileService')<
	FileService,
	Effect.Effect.Success<typeof make>
>() {
	static readonly Live = Layer.effect(this, make)
}
