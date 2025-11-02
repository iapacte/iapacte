import { Effect } from 'effect'
import type { FastifyInstance } from 'fastify'

import { authenticateRequest } from '../lib/auth_helper'
import { LoroDocumentService, RuntimeClient } from '../services'

interface CreateDocumentBody {
	title: string
	description: string
	path: string
	initialContent?: string // Base64 encoded Uint8Array
}

interface UpdateMetadataBody {
	title?: string
	description?: string
	path?: string
}

export async function routesDocuments(server: FastifyInstance) {
	server.addHook('preHandler', async (request, reply) => {
		// Check if the request URL starts with /v1/docs
		if (!request.url.startsWith('/v1/docs')) {
			return
		}

		const isAuthenticated = await authenticateRequest(request, reply)
		if (!isAuthenticated) {
			return reply
		}
	})

	// Create new document (CRDT-backed "flow")
	server.post<{ Body: CreateDocumentBody }>('/v1/docs', {
		handler: async (request, reply) => {
			const { title, description, path, initialContent } = request.body
			const session = (request as any).session
			const userId = session.user.id
			const documentId = crypto.randomUUID()

			try {
				const result = await RuntimeClient.runPromise(
					Effect.gen(function* () {
						const service = yield* LoroDocumentService
						const contentBytes = initialContent
							? Uint8Array.from(Buffer.from(initialContent, 'base64'))
							: undefined
						yield* service.createDocument(
							documentId,
							title,
							description,
							path,
							userId,
							contentBytes,
						)
						return { documentId, success: true as const }
					}),
				)
				return reply.send(result)
			} catch (error) {
				request.log.error({ error }, 'Failed to create document')
				return reply.status(500).send({ error: 'Failed to create document' })
			}
		},
	})

	// Get document (metadata) or content with alt=media
	server.get<{ Params: { docId: string } }>('/v1/docs/:docId', {
		handler: async (request, reply) => {
			const { docId } = request.params
			try {
				const query: any = (request as any).query ?? {}
				const alt = typeof query.alt === 'string' ? query.alt : ''

				if (alt === 'media') {
					const snapshot = await RuntimeClient.runPromise(
						Effect.gen(function* () {
							const service = yield* LoroDocumentService
							return yield* service.exportSnapshot(docId)
						}),
					)
					reply.header('Content-Type', 'application/octet-stream')
					return reply.send(Buffer.from(snapshot))
				}

				const metadata = await RuntimeClient.runPromise(
					Effect.gen(function* () {
						const service = yield* LoroDocumentService
						return yield* service.readMetadata(docId)
					}),
				)
				return reply.send({ success: true, document: metadata })
			} catch (error) {
				request.log.error({ error }, 'Failed to get document')
				return reply.status(500).send({ error: 'Failed to get document' })
			}
		},
	})

	// Update metadata
	server.put<{ Params: { docId: string }; Body: UpdateMetadataBody }>(
		'/v1/docs/:docId',
		{
			handler: async (request, reply) => {
				const { docId } = request.params
				const { title, description, path } = request.body
				try {
					const result = await RuntimeClient.runPromise(
						Effect.gen(function* () {
							const service = yield* LoroDocumentService
							yield* service.updateMetadata(docId, title, description, path)
							return { success: true as const }
						}),
					)
					return reply.send(result)
				} catch (error) {
					request.log.error({ error }, 'Failed to update metadata')
					return reply.status(500).send({ error: 'Failed to update metadata' })
				}
			},
		},
	)

	// Delete document
	server.delete<{ Params: { docId: string } }>('/v1/docs/:docId', {
		handler: async (request, reply) => {
			const { docId } = request.params
			try {
				const result = await RuntimeClient.runPromise(
					Effect.gen(function* () {
						const service = yield* LoroDocumentService
						yield* service.deleteDocument(docId)
						return { success: true as const }
					}),
				)
				return reply.send(result)
			} catch (error) {
				request.log.error({ error }, 'Failed to delete document')
				return reply.status(500).send({ error: 'Failed to delete document' })
			}
		},
	})

	// List documents
	server.get('/v1/docs', {
		handler: async (request, reply) => {
			try {
				const documents = await RuntimeClient.runPromise(
					Effect.gen(function* () {
						const service = yield* LoroDocumentService
						const ids = yield* service.listDocuments()
						const out: Array<any> = []
						for (const id of ids) {
							const meta = yield* service.readMetadata(id)
							out.push({ id, ...meta })
						}
						return out
					}),
				)
				return reply.send({ documents })
			} catch (error) {
				request.log.error({ error }, 'Failed to list documents')
				return reply.status(500).send({ error: 'Failed to list documents' })
			}
		},
	})

	// WebSocket sync (real-time collaboration)
	server.get(
		'/v1/docs/:docId/sync',
		{ websocket: true },
		async (connection, request) => {
			const { docId } = request.params as { docId: string }
			const session = (request as any).session
			const _userId = session.user.id
			const serverDoc = await RuntimeClient.runPromise(
				Effect.gen(function* () {
					const service = yield* LoroDocumentService
					const opt = yield* service.getDocument(docId)
					if (opt._tag === 'None') return undefined
					return opt.value
				}),
			)
			if (!serverDoc) {
				connection.close(1008, 'Document not found')
				return
			}
			let isInitialSync = true

			// Subscribe to document updates and forward to client
			const unsubscribe = serverDoc.subscribeLocalUpdates(update => {
				// Don't send back the update that came from this client
				if (!isInitialSync) {
					connection.send(update)
				}
			})

			connection.on('message', async message => {
				if (message instanceof Buffer) {
					try {
						// Apply the update to the server document
						serverDoc.import(new Uint8Array(message))

						// If this is the first message, it's the initial sync
						if (isInitialSync) {
							isInitialSync = false
							// Send back the current state after merging
							const currentState = serverDoc.export({ mode: 'update' })
							connection.send(currentState)
						}

						try {
							await RuntimeClient.runPromise(
								Effect.gen(function* () {
									const service = yield* LoroDocumentService
									yield* service.applyUpdate(docId, new Uint8Array(message))
								}),
							)
						} catch (err) {
							request.log.error({ error: err }, 'WS apply update error')
						}
					} catch (error) {
						request.log.error({ error }, 'Failed to process message')
					}
				}
			})

			connection.on('close', () => {
				unsubscribe()
			})
		},
	)

	// HTTP sync fallback: accepts JSON { update: base64 }
	server.post<{ Params: { docId: string }; Body: { update: string } }>(
		'/v1/docs/:docId/sync',
		{
			handler: async (request, reply) => {
				const { docId } = request.params
				const { update } = request.body
				try {
					const merged = await RuntimeClient.runPromise(
						Effect.gen(function* () {
							const service = yield* LoroDocumentService
							const bytes = Uint8Array.from(Buffer.from(update, 'base64'))
							yield* service.applyUpdate(docId, bytes)
							return yield* service.exportUpdate(docId)
						}),
					)
					return reply.send({
						success: true,
						updates: Buffer.from(merged).toString('base64'),
					})
				} catch (error) {
					request.log.error({ error }, 'Failed to sync document')
					return reply.status(500).send({ success: false, error: 'Sync error' })
				}
			},
		},
	)
}
