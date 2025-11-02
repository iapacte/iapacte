import { randomUUID } from 'node:crypto'
import { Effect, Option } from 'effect'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

import { authenticateRequest } from '../lib/auth_helper'
import { FileService, RuntimeClient } from '../services'
import type { FileMetadata } from '../services/files'

const serializeMetadata = (metadata: FileMetadata) => ({
	...metadata,
})

const ensureStringArray = (
	value: unknown,
	fieldName: string,
): string[] | undefined => {
	if (value === undefined || value === null) {
		return undefined
	}
	if (!Array.isArray(value)) {
		throw new Error(`${fieldName} must be an array of strings`)
	}
	const out: string[] = []
	for (const item of value) {
		if (typeof item !== 'string') {
			throw new Error(`${fieldName} must contain only strings`)
		}
		out.push(item)
	}
	return out
}

const ensureRecord = (
	value: unknown,
	fieldName: string,
): Record<string, string | null | undefined> | undefined => {
	if (value === undefined || value === null) {
		return undefined
	}
	if (typeof value !== 'object' || Array.isArray(value)) {
		throw new Error(`${fieldName} must be an object`)
	}
	const record: Record<string, string | null | undefined> = {}
	for (const [key, v] of Object.entries(value)) {
		if (v === null || v === undefined || typeof v === 'string') {
			record[key] = v
			continue
		}
		throw new Error(`${fieldName} values must be strings or null`)
	}
	return record
}

const parseBase64 = (
	value: unknown,
	fieldName: string,
): Uint8Array | undefined => {
	if (value === undefined || value === null) return undefined
	if (typeof value !== 'string') {
		throw new Error(`${fieldName} must be a base64-encoded string`)
	}
	return Uint8Array.from(Buffer.from(value, 'base64'))
}

type CreateJsonBody = {
	name?: string
	title?: string
	description?: string | null
	mimeType: string
	parents?: unknown
	properties?: unknown
	appProperties?: unknown
	path?: string | null
	initialContent?: string
	contentKind?: 'binary' | 'crdt' | 'folder'
}

type CreateJsonRequest = FastifyRequest<{
	Body: CreateJsonBody
	Querystring: { uploadType?: string }
}>

type PatchMetadataBody = {
	name?: string
	description?: string | null
	mimeType?: string
	parents?: unknown
	properties?: unknown
	appProperties?: unknown
	path?: string | null
}

type CrdtPatchBody = {
	update?: string
	updates?: string
}

type SyncBody = {
	update: string
}

const toUint8Array = (input: unknown): Uint8Array => {
	if (input instanceof Uint8Array) {
		return input
	}
	if (Buffer.isBuffer(input)) {
		return new Uint8Array(input)
	}
	if (typeof input === 'string') {
		return new Uint8Array(Buffer.from(input, 'utf8'))
	}
	throw new Error('Unsupported payload format')
}

async function requireAuthenticated(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const isAuthenticated = await authenticateRequest(request, reply)
	if (!isAuthenticated) {
		throw new Error('unauthorized')
	}
}

export async function routesFiles(server: FastifyInstance) {
	server.addHook('preHandler', async (request, reply) => {
		if (!request.url.startsWith('/files')) return
		try {
			await requireAuthenticated(request, reply)
		} catch {
			// Authentication helper already responded
			return reply
		}
	})

	server.post('/files', {
		handler: async (request, reply) => {
			const query = request.query as { uploadType?: string }
			const uploadType = (query.uploadType ?? 'json').toLowerCase()
			const session = (request as any).session
			const ownerId: string | undefined = session?.user?.id

			if (!ownerId) {
				return reply.status(401).send({ error: 'Unauthorized' })
			}

			const fileId = randomUUID()

			const runCreate = async (
				metadata: {
					name?: string
					title?: string
					description?: string | null
					mimeType?: string
					parents?: unknown
					properties?: unknown
					appProperties?: unknown
					path?: string | null
					contentKind?: 'binary' | 'crdt' | 'folder'
				},
				content?: Uint8Array,
			) => {
				const name = metadata.name ?? metadata.title
				if (!name || typeof name !== 'string') {
					return reply
						.status(400)
						.send({ error: 'Missing required field "name"' })
				}
				if (!metadata.mimeType || typeof metadata.mimeType !== 'string') {
					return reply
						.status(400)
						.send({ error: 'Missing required field "mimeType"' })
				}

				let parents: string[] | undefined
				let properties: Record<string, string | null | undefined> | undefined
				let appProperties: Record<string, string | null | undefined> | undefined

				try {
					parents = ensureStringArray(metadata.parents, 'parents')
					properties = ensureRecord(metadata.properties, 'properties')
					appProperties = ensureRecord(metadata.appProperties, 'appProperties')
				} catch (error) {
					return reply.status(400).send({ error: (error as Error).message })
				}

				try {
					const created = await RuntimeClient.runPromise(
						Effect.gen(function* () {
							const service = yield* FileService
							return yield* service.createFile({
								id: fileId,
								ownerId,
								metadata: {
									name,
									description: metadata.description ?? null,
									mimeType: metadata.mimeType,
									parents,
									properties,
									appProperties,
									path: metadata.path ?? null,
									contentKind: metadata.contentKind,
								},
								content,
							})
						}),
					)
					return reply.status(201).send({ file: serializeMetadata(created) })
				} catch (error) {
					request.log.error({ error }, 'Failed to create file')
					return reply.status(500).send({ error: 'Failed to create file' })
				}
			}

			if (uploadType === 'multipart') {
				if (!(request as any).isMultipart?.()) {
					return reply.status(400).send({
						error: 'uploadType=multipart requires multipart/form-data request',
					})
				}

				let metadataRaw: any
				let fileBuffer: Uint8Array | undefined
				let mimeTypeFromFile: string | undefined

				const parts = (request as any).parts?.()
				if (!parts || typeof parts[Symbol.asyncIterator] !== 'function') {
					return reply.status(400).send({
						error: 'Invalid multipart payload',
					})
				}

				for await (const part of parts) {
					if (part.type === 'file') {
						const chunks: Buffer[] = []
						for await (const chunk of part.file) {
							chunks.push(chunk as Buffer)
						}
						fileBuffer = new Uint8Array(Buffer.concat(chunks))
						mimeTypeFromFile =
							typeof part.mimetype === 'string' ? part.mimetype : undefined
					} else if (part.type === 'field') {
						if (part.fieldname === 'metadata') {
							try {
								metadataRaw = JSON.parse(part.value)
							} catch (_error) {
								return reply
									.status(400)
									.send({ error: 'Invalid metadata JSON payload' })
							}
						}
					}
				}

				if (!metadataRaw) {
					return reply
						.status(400)
						.send({ error: 'Missing metadata part in multipart upload' })
				}

				if (!metadataRaw.mimeType && mimeTypeFromFile) {
					metadataRaw.mimeType = mimeTypeFromFile
				}

				return runCreate(metadataRaw, fileBuffer)
			}

			const body = (request as CreateJsonRequest).body
			const content = parseBase64(body.initialContent, 'initialContent')
			return runCreate(body, content)
		},
	})

	server.get('/files', {
		handler: async (request, reply) => {
			const query = request.query as { parent?: string; mimeType?: string }
			try {
				const files = await RuntimeClient.runPromise(
					Effect.gen(function* () {
						const service = yield* FileService
						return yield* service.listFiles({
							parent: query.parent,
							mimeType: query.mimeType,
						})
					}),
				)
				return reply.send({ files: files.map(serializeMetadata) })
			} catch (error) {
				request.log.error({ error }, 'Failed to list files')
				return reply.status(500).send({ error: 'Failed to list files' })
			}
		},
	})

	server.get('/files/:fileId', {
		handler: async (request, reply) => {
			const { fileId } = request.params as { fileId: string }
			const query = request.query as { alt?: string }
			try {
				const metadataOpt = await RuntimeClient.runPromise(
					Effect.gen(function* () {
						const service = yield* FileService
						return yield* service.getMetadata(fileId)
					}),
				)

				if (Option.isNone(metadataOpt)) {
					return reply.status(404).send({ error: 'File not found' })
				}

				const metadata = metadataOpt.value

				if ((query.alt ?? '') === 'media') {
					if (metadata.kind === 'folder') {
						return reply
							.status(400)
							.send({ error: 'Folders do not have streamable content' })
					}

					try {
						const payload =
							metadata.kind === 'crdt'
								? await RuntimeClient.runPromise(
										Effect.gen(function* () {
											const service = yield* FileService
											return yield* service.exportCrdtSnapshot(fileId)
										}),
									)
								: await RuntimeClient.runPromise(
										Effect.gen(function* () {
											const service = yield* FileService
											return yield* service.readBinaryContent(fileId)
										}),
									)
						if (metadata.kind === 'binary') {
							reply.header('Content-Type', metadata.mimeType)
						} else {
							reply.header('Content-Type', 'application/octet-stream')
						}
						return reply.send(Buffer.from(payload))
					} catch (error) {
						request.log.error({ error }, 'Failed to read file content')
						return reply.status(500).send({ error: 'Failed to read content' })
					}
				}

				return reply.send({ file: serializeMetadata(metadata) })
			} catch (error) {
				request.log.error({ error }, 'Failed to fetch file metadata')
				return reply.status(500).send({ error: 'Failed to load file' })
			}
		},
	})

	server.patch('/files/:fileId', {
		handler: async (request, reply) => {
			const { fileId } = request.params as { fileId: string }
			const contentType = (request.headers['content-type'] ?? '').toString()

			if (contentType.includes('application/vnd.loro.oplog+json')) {
				const body = request.body as CrdtPatchBody | undefined
				const encoded = body?.update ?? body?.updates
				if (!encoded || typeof encoded !== 'string') {
					return reply
						.status(400)
						.send({ error: 'Missing CRDT update payload' })
				}
				const updateBytes = Uint8Array.from(Buffer.from(encoded, 'base64'))
				try {
					await RuntimeClient.runPromise(
						Effect.gen(function* () {
							const service = yield* FileService
							yield* service.applyCrdtUpdate(fileId, updateBytes)
						}),
					)
					return reply.status(204).send()
				} catch (error) {
					request.log.error({ error }, 'Failed to apply CRDT update')
					return reply
						.status(500)
						.send({ error: 'Failed to apply CRDT update' })
				}
			}

			const body = request.body as PatchMetadataBody | undefined
			if (!body) {
				return reply.status(400).send({ error: 'Missing metadata payload' })
			}

			let parents: string[] | undefined
			let properties: Record<string, string | null | undefined> | undefined
			let appProperties: Record<string, string | null | undefined> | undefined

			try {
				parents = ensureStringArray(body.parents, 'parents')
				properties = ensureRecord(body.properties, 'properties')
				appProperties = ensureRecord(body.appProperties, 'appProperties')
			} catch (error) {
				return reply.status(400).send({ error: (error as Error).message })
			}

			try {
				const metadata = await RuntimeClient.runPromise(
					Effect.gen(function* () {
						const service = yield* FileService
						return yield* service.updateMetadata(fileId, {
							name: body.name,
							description: body.description ?? undefined,
							mimeType: body.mimeType,
							parents,
							properties,
							appProperties,
							path: body.path ?? undefined,
						})
					}),
				)
				return reply.send({ file: serializeMetadata(metadata) })
			} catch (error) {
				request.log.error({ error }, 'Failed to update metadata')
				return reply.status(500).send({ error: 'Failed to update metadata' })
			}
		},
	})

	server.put('/files/:fileId', {
		handler: async (request, reply) => {
			const { fileId } = request.params as { fileId: string }
			const query = request.query as { alt?: string }
			if ((query.alt ?? '') !== 'media') {
				return reply
					.status(400)
					.send({ error: 'PUT requires alt=media for content replacement' })
			}

			try {
				const payload = toUint8Array(request.body)
				await RuntimeClient.runPromise(
					Effect.gen(function* () {
						const service = yield* FileService
						yield* service.replaceBinaryContent(fileId, payload)
					}),
				)
				const metadataOpt = await RuntimeClient.runPromise(
					Effect.gen(function* () {
						const service = yield* FileService
						return yield* service.getMetadata(fileId)
					}),
				)
				if (Option.isNone(metadataOpt)) {
					return reply.status(404).send({ error: 'File not found' })
				}
				return reply.send({ file: serializeMetadata(metadataOpt.value) })
			} catch (error) {
				request.log.error({ error }, 'Failed to replace binary content')
				if (
					error instanceof Error &&
					error.name === 'InvalidFileOperationError'
				) {
					return reply.status(400).send({ error: error.message })
				}
				return reply.status(500).send({ error: 'Failed to update content' })
			}
		},
	})

	server.delete('/files/:fileId', {
		handler: async (request, reply) => {
			const { fileId } = request.params as { fileId: string }
			try {
				await RuntimeClient.runPromise(
					Effect.gen(function* () {
						const service = yield* FileService
						yield* service.deleteFile(fileId)
					}),
				)
				return reply.status(204).send()
			} catch (error) {
				request.log.error({ error }, 'Failed to delete file')
				return reply.status(500).send({ error: 'Failed to delete file' })
			}
		},
	})

	server.post('/files/:fileId/sync', {
		handler: async (request, reply) => {
			const { fileId } = request.params as { fileId: string }
			const body = request.body as SyncBody | undefined
			if (!body?.update || typeof body.update !== 'string') {
				return reply
					.status(400)
					.send({ error: 'Missing update payload in request body' })
			}
			const updateBytes = Uint8Array.from(Buffer.from(body.update, 'base64'))
			try {
				const merged = await RuntimeClient.runPromise(
					Effect.gen(function* () {
						const service = yield* FileService
						yield* service.applyCrdtUpdate(fileId, updateBytes)
						return yield* service.exportCrdtUpdate(fileId)
					}),
				)
				return reply.send({
					success: true,
					updates: Buffer.from(merged).toString('base64'),
				})
			} catch (error) {
				request.log.error({ error }, 'Failed to sync CRDT file')
				return reply.status(500).send({ error: 'Failed to sync file' })
			}
		},
	})

	server.get(
		'/files/:fileId/sync',
		{ websocket: true },
		async (connection, request) => {
			const { fileId } = request.params as { fileId: string }
			try {
				const metadataOpt = await RuntimeClient.runPromise(
					Effect.gen(function* () {
						const service = yield* FileService
						return yield* service.getMetadata(fileId)
					}),
				)
				if (Option.isNone(metadataOpt)) {
					connection.close(1008, 'File not found')
					return
				}
				const metadata = metadataOpt.value
				if (metadata.kind !== 'crdt') {
					connection.close(1003, 'File is not collaborative')
					return
				}

				const doc = await RuntimeClient.runPromise(
					Effect.gen(function* () {
						const service = yield* FileService
						return yield* service.getCrdtDocument(fileId)
					}),
				)

				let isInitialSync = true
				const unsubscribe = doc.subscribeLocalUpdates(update => {
					if (!isInitialSync) {
						connection.send(update)
					}
				})

				connection.on('message', async message => {
					try {
						let updateBytes: Uint8Array

						if (message instanceof Buffer) {
							updateBytes = new Uint8Array(message)
						} else if (message instanceof ArrayBuffer) {
							updateBytes = new Uint8Array(message)
						} else if (typeof message === 'string') {
							updateBytes = Uint8Array.from(Buffer.from(message, 'base64'))
						} else {
							throw new Error('Unsupported message format')
						}

						doc.import(updateBytes)

						if (isInitialSync) {
							isInitialSync = false
							const currentState = doc.export({ mode: 'update' })
							connection.send(currentState)
						}

						await RuntimeClient.runPromise(
							Effect.gen(function* () {
								const service = yield* FileService
								yield* service.applyCrdtUpdate(fileId, updateBytes)
							}),
						)
					} catch (error) {
						request.log.error({ error }, 'Failed to process sync message')
						connection.close(1011, 'Failed to process update')
					}
				})

				connection.on('close', () => {
					unsubscribe()
				})
			} catch (error) {
				request.log.error({ error }, 'Failed to establish sync socket')
				connection.close(1011, 'Internal server error')
			}
		},
	)
}
