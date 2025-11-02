import { Effect, Option } from 'effect'
import type { FastifyInstance } from 'fastify'

import { authenticateRequest } from '~lib/auth_helper'
import { LoroDiagramService, RuntimeClient } from '~services'

interface CreateDiagramBody {
	title: string
	description: string
	path: string
	initialContent?: string // Base64-encoded Uint8Array
}

interface UpdateMetadataBody {
	title?: string
	description?: string
	path?: string
}

export async function routesDiagrams(server: FastifyInstance) {
	server.addHook('preHandler', async (request, reply) => {
		if (!request.url.startsWith('/v1/diagrams')) return
		const isAuthenticated = await authenticateRequest(request, reply)
		if (!isAuthenticated) return reply
	})

	// Create new diagram
	server.post<{ Body: CreateDiagramBody }>('/v1/diagrams', {
		handler: async (request, reply) => {
			const { title, description, path, initialContent } = request.body
			const session = (request as any).session
			const userId = session.user.id
			const diagramId = crypto.randomUUID()
			try {
				const result = await RuntimeClient.runPromise(
					Effect.gen(function* () {
						const diagService = yield* LoroDiagramService
						const contentBytes = initialContent
							? Uint8Array.from(Buffer.from(initialContent, 'base64'))
							: undefined
						yield* diagService.createDiagram(
							diagramId,
							title,
							description,
							path,
							userId,
							contentBytes,
						)
						return { diagramId, success: true }
					}).pipe(
						Effect.catchAll(error => {
							request.log.error({ error }, 'Create error')
							return Effect.succeed({ success: false, error: error.message })
						}),
					),
				)
				return reply.send(result)
			} catch (error) {
				request.log.error({ error }, 'Failed to create diagram')
				return reply.status(500).send({ error: 'Failed to create diagram' })
			}
		},
	})

	// Get diagram
	server.get<{ Params: { diagId: string } }>('/v1/diagrams/:diagId', {
		handler: async (request, reply) => {
			const { diagId } = request.params
			try {
				const result = await RuntimeClient.runPromise(
					Effect.gen(function* () {
						const diagService = yield* LoroDiagramService
						const diagOpt = yield* diagService.getDiagram(diagId)
						if (Option.isNone(diagOpt))
							return { success: false, message: 'Not found' }
						return { success: true, diagram: diagOpt.value.toJSON().diagram }
					}).pipe(
						Effect.catchAll(error => {
							request.log.error({ error }, 'Get error')
							return Effect.succeed({
								success: false,
								error: JSON.stringify(error),
							})
						}),
					),
				)
				return reply.send(result)
			} catch (error) {
				request.log.error({ error }, 'Failed to get diagram')
				return reply.status(500).send({ error: 'Failed to get diagram' })
			}
		},
	})

	// Update metadata
	server.put<{ Params: { diagId: string }; Body: UpdateMetadataBody }>(
		'/v1/diagrams/:diagId',
		{
			handler: async (request, reply) => {
				const { diagId } = request.params
				const { title, description, path } = request.body
				try {
					const result = await RuntimeClient.runPromise(
						Effect.gen(function* () {
							const diagService = yield* LoroDiagramService
							yield* diagService.updateMetadata(
								diagId,
								title,
								description,
								path,
							)
							return { success: true }
						}).pipe(
							Effect.catchAll(error => {
								request.log.error({ error }, 'Update error')
								return Effect.succeed({ success: false, error: error.message })
							}),
						),
					)
					return reply.send(result)
				} catch (error) {
					request.log.error({ error }, 'Failed to update metadata')
					return reply.status(500).send({ error: 'Failed to update metadata' })
				}
			},
		},
	)

	// Delete diagram
	server.delete<{ Params: { diagId: string } }>('/v1/diagrams/:diagId', {
		handler: async (request, reply) => {
			const { diagId } = request.params
			try {
				const result = await RuntimeClient.runPromise(
					Effect.gen(function* () {
						const diagService = yield* LoroDiagramService
						yield* diagService.deleteDiagram(diagId)
						return { success: true }
					}).pipe(
						Effect.catchAll(error => {
							request.log.error({ error }, 'Delete error')
							return Effect.succeed({ success: false, error: error.message })
						}),
					),
				)
				return reply.send(result)
			} catch (error) {
				request.log.error({ error }, 'Failed to delete diagram')
				return reply.status(500).send({ error: 'Failed to delete diagram' })
			}
		},
	})

	// List diagrams
	server.get('/v1/diagrams', {
		handler: async (request, reply) => {
			try {
				const diagramsList = await RuntimeClient.runPromise(
					Effect.gen(function* () {
						const diagService = yield* LoroDiagramService
						const ids = yield* diagService.listDiagrams()
						const diags = []
						for (const id of ids) {
							const diagOpt = yield* diagService.getDiagram(id)
							if (Option.isSome(diagOpt)) {
								diags.push({ id, ...diagOpt.value.toJSON().diagram })
							}
						}
						return diags
					}).pipe(
						Effect.catchAll(error => {
							request.log.error({ error }, 'List error')
							return Effect.succeed([])
						}),
					),
				)
				return reply.send({ diagrams: diagramsList })
			} catch (error) {
				request.log.error({ error }, 'Failed to list diagrams')
				return reply.status(500).send({ error: 'Failed to list diagrams' })
			}
		},
	})

	// Sync diagram (HTTP fallback)
	server.post<{ Params: { diagId: string } }>('/v1/diagrams/:diagId/sync', {
		handler: async (request, reply) => {
			const { diagId } = request.params
			const session = (request as any).session
			const userId = session.user.id
			const update = request.body as Uint8Array // Assume octet-stream
			try {
				const result = await RuntimeClient.runPromise(
					Effect.gen(function* () {
						const diagService = yield* LoroDiagramService
						yield* diagService.applyUpdate(diagId, update, userId)
						const updates = yield* diagService.getUpdates(diagId) // Return merged updates
						return {
							success: true,
							updates: Buffer.from(updates).toString('base64'),
						}
					}).pipe(
						Effect.catchAll(error => {
							request.log.error({ error }, 'Sync error')
							return Effect.succeed({ success: false, error: error.message })
						}),
					),
				)
				return reply.send(result)
			} catch (error) {
				request.log.error({ error }, 'Failed to sync diagram')
				return reply.status(500).send({ error: 'Failed to sync diagram' })
			}
		},
	})

	// History
	server.get<{ Params: { diagId: string } }>('/v1/diagrams/:diagId/history', {
		handler: async (request, reply) => {
			const { diagId } = request.params
			try {
				const history = await RuntimeClient.runPromise(
					Effect.gen(function* () {
						const diagService = yield* LoroDiagramService
						return yield* diagService.getHistory(diagId)
					}),
				)
				return reply.send({ history })
			} catch (error) {
				request.log.error({ error }, 'Failed to get history')
				return reply.status(500).send({ error: 'Failed to get history' })
			}
		},
	})

	// Checkout version
	server.post<{ Params: { diagId: string }; Body: { version: any } }>(
		'/v1/diagrams/:diagId/checkout',
		{
			handler: async (request, reply) => {
				const { diagId } = request.params
				const { version } = request.body
				try {
					await RuntimeClient.runPromise(
						Effect.gen(function* () {
							const diagService = yield* LoroDiagramService
							const diagOpt = yield* diagService.getDiagram(diagId)
							if (Option.isNone(diagOpt))
								return yield* Effect.fail(new Error('Diagram not found'))
							diagOpt.value.checkout(version) // Loro checkout
							// Persist if needed, or client reloads
							return undefined
						}),
					)
					return reply.send({ success: true })
				} catch (error) {
					request.log.error({ error }, 'Failed to checkout version')
					return reply.status(500).send({ error: 'Failed to checkout version' })
				}
			},
		},
	)

	// Create snapshot
	server.post<{ Params: { diagId: string }; Body: { message?: string } }>(
		'/v1/diagrams/:diagId/snapshot',
		{
			handler: async (request, reply) => {
				const { diagId } = request.params
				const { message } = request.body
				const session = (request as any).session
				const userId = session.user.id
				try {
					await RuntimeClient.runPromise(
						Effect.gen(function* () {
							const diagService = yield* LoroDiagramService
							yield* diagService.createSnapshot(diagId, userId, message)
							return undefined
						}),
					)
					return reply.send({ success: true })
				} catch (error) {
					request.log.error({ error }, 'Failed to create snapshot')
					return reply.status(500).send({ error: 'Failed to create snapshot' })
				}
			},
		},
	)

	// WebSocket sync
	server.get(
		'/v1/diagrams/:diagId/sync',
		{ websocket: true },
		async (connection, request) => {
			const { diagId } = request.params as { diagId: string }
			const session = (request as any).session
			const userId = session.user.id
			const diagOpt = await RuntimeClient.runPromise(
				Effect.gen(function* () {
					const diagService = yield* LoroDiagramService
					return yield* diagService.getDiagram(diagId)
				}).pipe(
					Effect.catchAll(error => {
						request.log.error({ error }, 'WS get diagram error')
						return Effect.succeed(Option.none())
					}),
				),
			)
			if (Option.isNone(diagOpt)) {
				connection.close(1008, 'Diagram not found')
				return
			}
			const serverDiag = diagOpt.value
			let isInitialSync = true
			const unsubscribe = serverDiag.subscribeLocalUpdates(update => {
				if (!isInitialSync) {
					connection.send(update)
				}
			})
			connection.on('message', async message => {
				if (message instanceof Buffer) {
					try {
						serverDiag.import(new Uint8Array(message))
						if (isInitialSync) {
							isInitialSync = false
							const currentState = serverDiag.export({ mode: 'update' })
							connection.send(currentState)
						}
						await RuntimeClient.runPromise(
							Effect.gen(function* () {
								const diagService = yield* LoroDiagramService
								yield* diagService.applyUpdate(
									diagId,
									new Uint8Array(message),
									userId,
								)
							}).pipe(
								Effect.catchAll(error => {
									request.log.error({ error }, 'WS apply update error')
									return Effect.void
								}),
							),
						)
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
}
