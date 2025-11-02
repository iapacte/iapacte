import path from 'node:path'
import { PlatformLogger } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'
import { Config, Effect, Layer, Logger, LogLevel } from 'effect'

const fileLogger = Effect.gen(function* () {
	const filename = yield* Config.string('LOG_FILENAME')
	const filePath = path.join(process.cwd(), filename)
	return yield* Logger.logfmtLogger.pipe(PlatformLogger.toFile(filePath))
})

const LogLevelLive = Config.logLevel('MIN_LOG_LEVEL').pipe(
	Config.withDefault(LogLevel.Info),
	Effect.tap(level => Effect.logInfo(`⚙️  Set LogLevel=${level._tag}`)),
	Effect.map(level => Logger.minimumLogLevel(level)),
	Layer.unwrapEffect,
)

const isDevelopment = Config.string('NODE_ENV').pipe(
	Config.map(env => env === 'development'),
	Config.withDefault(false),
)

/**
 * Logs to the console.
 * In development, it also logs to a file in the current working directory.
 */
export const LoggerLive = Layer.unwrapEffect(
	Effect.gen(function* () {
		const isDev = yield* isDevelopment

		if (isDev) {
			const file = yield* fileLogger

			return Logger.replace(Logger.structuredLogger, file)
		}

		return Logger.json
	}),
).pipe(Layer.provide(NodeFileSystem.layer), Layer.provide(LogLevelLive))
