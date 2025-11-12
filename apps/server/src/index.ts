import { createServer } from 'node:http'
import { Env } from '@aipacto/shared-utils-env'
import { logAppServer } from '@aipacto/shared-utils-logging'
import {
	HttpApiBuilder,
	HttpApiSwagger,
	HttpMiddleware,
	HttpServer,
} from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { Effect, Layer } from 'effect'

import { Auth, EnvVars, LoggerLive } from '~lib'
import {
	AuthorizationService,
	BetterAuth,
	OpenFGAClient,
	SessionLive,
	WorkspaceStore,
} from '~services'
import { GroupApiLive } from './api/live/api.js'
import { BetterAuthApiLive } from './api/live/better_auth.js'

const middleware = Layer.mergeAll(
	HttpApiBuilder.middlewareOpenApi({ path: '/api/openapi.json' }),
	HttpApiSwagger.layer({ path: '/api/docs' }),
)

const CorsLive = Layer.unwrapEffect(
	EnvVars.pipe(
		Effect.map(env =>
			HttpApiBuilder.middlewareCors({
				credentials: true,
				allowedOrigins: env.ALLOWED_ORIGINS,
			}),
		),
	),
)

const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
	Layer.provide(middleware),
	Layer.provide(CorsLive),
	Layer.provide(EnvVars.Default),
	Layer.provide(Auth.Default),
	Layer.provide(BetterAuth.Default),
	Layer.provide(BetterAuthApiLive),
	Layer.provide(GroupApiLive),
	Layer.provide(SessionLive),
	Layer.provide(WorkspaceStore.Live),
	Layer.provide(OpenFGAClient.Default),
	Layer.provide(AuthorizationService.Live),
	HttpServer.withLogAddress,
	Layer.provide(LoggerLive),
	Layer.provide(
		NodeHttpServer.layer(createServer, {
			port: Number.parseInt(
				process.env.SERVER_PORT ?? process.env.PORT ?? '4000',
				10,
			),
			host: process.env.SERVER_HOST ?? '0.0.0.0',
		}),
	),
)

const program = Effect.gen(function* () {
	const env = yield* Env
	yield* env.load

	yield* Layer.launch(HttpLive).pipe(Effect.scoped)
}).pipe(
	Effect.tapError(error =>
		Effect.sync(() => logAppServer.error(error.message)),
	),
	Effect.provide(Env.Live),
)

NodeRuntime.runMain(program)
