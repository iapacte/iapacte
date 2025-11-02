import { Context, Effect, Layer, Option } from 'effect'
import { LoroDoc } from 'loro-crdt'

export type DocumentId = string

export type Metadata = {
	title: string
	description: string
	path: string
	createdAt: number
	updatedAt: number
	ownerId: string
	mimeType: string
}

const DEFAULT_MIME_TYPE = 'application/vnd.iapacte.flow+json'

function initializeDocumentStructure(
	doc: LoroDoc,
	{
		title,
		description,
		path,
		ownerId,
		mimeType,
	}: {
		title: string
		description: string
		path: string
		ownerId: string
		mimeType: string
	},
) {
	const documentMap = doc.getMap('document')
	documentMap.set('title', title)
	documentMap.set('description', description)
	documentMap.set('path', path)
	documentMap.set('ownerId', ownerId)
	documentMap.set('mimeType', mimeType)
	const now = Date.now()
	documentMap.set('createdAt', now)
	documentMap.set('updatedAt', now)
	const content = doc.getText('content')
	documentMap.setContainer('content', content)
	content.insert(0, '')
	doc.commit()
}

const make = Effect.sync(() => {
	const documents = new Map<DocumentId, LoroDoc>()

	return {
		createDocument: (
			id: DocumentId,
			title: string,
			description: string,
			path: string,
			ownerId: string,
			initialContent?: Uint8Array,
			mimeType: string = DEFAULT_MIME_TYPE,
		) =>
			Effect.try(() => {
				if (documents.has(id)) {
					throw new Error(`Document ${id} already exists`)
				}
				const doc = new LoroDoc()
				if (initialContent) {
					doc.import(initialContent)
				} else {
					initializeDocumentStructure(doc, {
						title,
						description,
						path,
						ownerId,
						mimeType,
					})
				}
				documents.set(id, doc)
			}),

		getDocument: (id: DocumentId) =>
			Effect.sync(() => Option.fromNullable(documents.get(id))),

		listDocuments: () => Effect.sync(() => Array.from(documents.keys())),

		deleteDocument: (id: DocumentId) =>
			Effect.sync(() => void documents.delete(id)),

		updateMetadata: (
			id: DocumentId,
			title?: string,
			description?: string,
			path?: string,
		) =>
			Effect.try(() => {
				const doc = documents.get(id)
				if (!doc) throw new Error('Not found')
				const map = doc.getMap('document')
				if (typeof title === 'string') map.set('title', title)
				if (typeof description === 'string') map.set('description', description)
				if (typeof path === 'string') map.set('path', path)
				map.set('updatedAt', Date.now())
				doc.commit()
			}),

		applyUpdate: (id: DocumentId, update: Uint8Array) =>
			Effect.try(() => {
				const doc = documents.get(id)
				if (!doc) throw new Error('Not found')
				doc.import(update)
			}),

		exportUpdate: (id: DocumentId) =>
			Effect.try(() => {
				const doc = documents.get(id)
				if (!doc) throw new Error('Not found')
				return doc.export({ mode: 'update' })
			}),

		exportSnapshot: (id: DocumentId) =>
			Effect.try(() => {
				const doc = documents.get(id)
				if (!doc) throw new Error('Not found')
				return doc.export({ mode: 'snapshot' })
			}),

		readMetadata: (id: DocumentId) =>
			Effect.try(() => {
				const doc = documents.get(id)
				if (!doc) throw new Error('Not found')
				const jsonUnknown = doc.toJSON() as unknown
				const root = jsonUnknown as Record<string, unknown>
				const meta =
					(root.document as Record<string, unknown> | undefined) ?? {}
				return {
					title: typeof meta.title === 'string' ? meta.title : '',
					description:
						typeof meta.description === 'string' ? meta.description : '',
					path: typeof meta.path === 'string' ? meta.path : '',
					createdAt:
						typeof meta.createdAt === 'number' ? meta.createdAt : Date.now(),
					updatedAt:
						typeof meta.updatedAt === 'number' ? meta.updatedAt : Date.now(),
					ownerId: typeof meta.ownerId === 'string' ? meta.ownerId : '',
					mimeType:
						typeof meta.mimeType === 'string'
							? meta.mimeType
							: DEFAULT_MIME_TYPE,
				} as Metadata
			}),
	} as const
})

export class LoroDocumentService extends Context.Tag('LoroDocumentService')<
	LoroDocumentService,
	Effect.Effect.Success<typeof make>
>() {
	static readonly Live = Layer.effect(this, make)
}
