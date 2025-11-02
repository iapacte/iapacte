import { Env } from '@aipacto/shared-utils-env'
import { logAppServer } from '@aipacto/shared-utils-logging'
import cors from '@fastify/cors'
import formbodyPlugin from '@fastify/formbody'
import multipartPlugin from '@fastify/multipart'
import webSocketPlugin from '@fastify/websocket'
import { createRequire } from 'node:module'
import { Effect } from 'effect'
import Fastify from 'fastify'

// import { routesAgents } from './routes/agents'
// import { routesThreads } from './routes/threads'
import { routesAuth } from './routes/auth'
import { routesFiles } from './routes/files'

type ServerConfig = {
	readonly environment: string
	readonly host: string
	readonly port: number
	readonly allowedOrigins: ReadonlySet<string>
}

function resolveServerConfig(): ServerConfig {
	const environment = process.env.NODE_ENV ?? 'development'
	const host = process.env.SERVER_HOST

	if (!host) {
		throw new Error('SERVER_HOST env variable is required')
	}

	const portValue = process.env.SERVER_PORT ?? process.env.PORT
	const portLabel =
		process.env.SERVER_PORT !== undefined ? 'SERVER_PORT' : 'PORT'

	if (!portValue) {
		throw new Error(
			'SERVER_PORT env variable is required (or PORT supplied by hosting)',
		)
	}

	const port = Number.parseInt(portValue, 10)

	if (!Number.isFinite(port) || port <= 0) {
		throw new Error(
			`${portLabel} env variable must be a positive integer, received "${portValue}"`,
		)
	}

	const allowedOriginsEntries =
		process.env.ALLOWED_ORIGINS?.split(',')
			.map(origin => origin.trim())
			.filter(origin => origin.length > 0) ?? []

	return {
		environment,
		host,
		port,
		allowedOrigins: new Set(allowedOriginsEntries),
	}
}

const moduleRequire = createRequire(import.meta.url)

function isPinoPrettyAvailable(): boolean {
	try {
		moduleRequire.resolve('pino-pretty')
		return true
	} catch {
		return false
	}
}

async function main() {
	try {
		await Effect.runPromise(Env.load.pipe(Effect.provide(Env.Live)))
	} catch (error) {
		logAppServer.error(
			'Failed to bootstrap application',
			(error as Error).toString(),
		)
		process.exit(1)
	}

	let config: ServerConfig

	try {
		config = resolveServerConfig()
	} catch (error) {
		if (error instanceof Error) {
			logAppServer.error('Invalid server configuration', error.message)
		} else {
			logAppServer.error('Invalid server configuration', String(error))
		}
		process.exit(1)
	}

	const prettyTransportAvailable =
		config.environment === 'development' && isPinoPrettyAvailable()

	if (config.environment === 'development' && !prettyTransportAvailable) {
		logAppServer.warn(
			'pino-pretty not found in runtime dependencies, falling back to JSON logging',
		)
	}

	const serverOptions = {
		logger:
			config.environment === 'development'
				? prettyTransportAvailable
					? {
							level: 'debug',
							transport: {
								target: 'pino-pretty',
								options: {
									colorize: true,
									translateTime: 'SYS:standard',
								},
							},
						}
					: {
							level: 'debug',
						}
				: {
						level: 'warn',
					},
		trustProxy: true,
	}

	const server = Fastify(serverOptions)

	logAppServer.info('Registering WebSocket plugin...')
	await server.register(webSocketPlugin, {
		options: {
			maxPayload: 1048576, // 1MB max message size
		},
	})

	// Register formbody plugin to parse form data
	logAppServer.info('Registering Formbody plugin')
	server.register(formbodyPlugin)

	// Register multipart plugin for uploads
	logAppServer.info('Registering Multipart plugin')
	server.register(multipartPlugin, {
		attachFieldsToBody: false,
	})

	// Register CORS
	logAppServer.info('Registering CORS plugin')
	server.register(cors, {
		origin: (origin, callback) => {
			// Allow all origins in development
			if (config.environment === 'development') {
				callback(null, true)
				return
			}

			const hasWildcardOrigin = config.allowedOrigins.has('*')

			if (!origin) {
				callback(null, true)
				return
			}

			if (hasWildcardOrigin || config.allowedOrigins.has(origin)) {
				callback(null, true)
				return
			}

			callback(new Error('CORS origin not allowed'), false)
		},
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Set-Cookie'],
		exposedHeaders: ['Set-Cookie', 'set-auth-token'],
		maxAge: 86400, // 24 hours
		preflight: true,
		strictPreflight: true,
	})

	server.setErrorHandler((err, _request, reply) => {
		logAppServer.error('Server error:', err)

		if (!reply.sent) {
			reply.status(500).send({ error: 'Internal Server Error' })
		}
	})

	// Health check route (no authentication required)
	logAppServer.info('Registering health check route')
	const healthHandler = async () => ({ message: 'OK' })
	server.get('/health', healthHandler)

	// Authentication routes (no authentication required)
	logAppServer.info('Registering authentication routes')
	await routesAuth(server)

	logAppServer.info('Registering application routes')

	// await routesAgents(server)
	await routesFiles(server)
	// await routesThreads(server)

	try {
		await server.listen({
			host: config.host,
			port: config.port,
		})

		server.log.info(
			`Server listening (environment=${config.environment}) at ${config.host}:${config.port}`,
		)
	} catch (error) {
		if (error instanceof Error) {
			logAppServer.error(error.toString())
		} else {
			logAppServer.error('An unknown error occurred')
		}
	}
}

await main()
