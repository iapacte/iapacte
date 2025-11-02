import { logAppServer } from '@aipacto/shared-utils-logging'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

import { auth } from '../lib/auth'

/**
 * Registers authentication routes
 */
export async function routesAuth(fastify: FastifyInstance) {
	// Register Better Auth routes with proper Fastify integration
	logAppServer.info('Registering Better Auth routes')

	fastify.route({
		method: ['GET', 'POST'],
		url: '/auth/*',
		async handler(request: FastifyRequest, reply: FastifyReply) {
			try {
				// Construct request URL with the correct external scheme
				const proto =
					(typeof request.headers['x-forwarded-proto'] === 'string' &&
						request.headers['x-forwarded-proto']) ||
					'http'
				const host = request.headers.host ?? 'localhost'
				const url = new URL(request.url, `${proto}://${host}`)

				// Convert Fastify headers to standard Headers object
				const headers = new Headers()
				Object.entries(request.headers).forEach(([key, value]) => {
					if (value) headers.append(key, value.toString())
				})

				// Create Fetch API-compatible request
				const requestInit: RequestInit = {
					method: request.method,
					headers,
				}

				// Only add body if it exists and is not empty
				if (request.body) {
					requestInit.body = JSON.stringify(request.body)
				}

				const req = new Request(url.toString(), requestInit)

				// Process authentication request
				const response = await auth.handler(req)

				// Forward response to client
				reply.status(response.status)
				response.headers.forEach((value, key) => {
					reply.header(key, value)
				})
				reply.send(response.body ? await response.text() : null)
			} catch (_error) {
				fastify.log.error('Authentication Error:')
				reply.status(500).send({
					error: 'Internal authentication error',
					code: 'AUTH_FAILURE',
				})
			}
		},
	})
}
