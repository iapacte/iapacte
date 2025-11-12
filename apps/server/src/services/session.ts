import {
	HttpApiMiddleware,
	HttpApiSecurity,
	HttpServerRequest,
} from '@effect/platform'
import { Context, Effect, Layer, type Redacted, Schema } from 'effect'

import { Auth, InternalServerError, Unauthorized } from '~lib'

export const CurrentUserSchema = Schema.Struct({
	sessionId: Schema.String,
	userId: Schema.String,
	email: Schema.String,
	name: Schema.optional(Schema.String),
	image: Schema.NullOr(Schema.String),
	emailVerified: Schema.optional(Schema.Boolean),
})

export class AuthenticatedSession extends Context.Tag('AuthenticatedSession')<
	AuthenticatedSession,
	Schema.Schema.Type<typeof CurrentUserSchema>
>() {}

export class SessionSpec extends HttpApiMiddleware.Tag<SessionSpec>()(
	'BetterAuthSession',
	{
		provides: AuthenticatedSession,
		failure: Schema.Union(Unauthorized, InternalServerError),
		security: {
			bearer: HttpApiSecurity.bearer,
		},
	},
) {}

export const SessionLive = Layer.effect(
	SessionSpec,
	Effect.gen(function* () {
		const auth = yield* Auth

		return {
			bearer: (_token: Redacted.Redacted<string>) =>
				Effect.gen(function* () {
					const request = yield* HttpServerRequest.HttpServerRequest

					const raw = request.source as Request
					const headers = new Headers(raw.headers)

					const session = yield* Effect.tryPromise({
						try: () =>
							auth.instance.api.getSession({
								headers,
							}),
						catch: _error =>
							new InternalServerError({
								message: 'Failed to get session from Better Auth',
							}),
					}).pipe(
						Effect.tapError(Effect.logError),
						Effect.catchTag('InternalServerError', error =>
							Effect.logError('BetterAuth session failure', error).pipe(
								Effect.andThen(Effect.fail(error)),
							),
						),
					)

					if (!session || !session.session || !session.user) {
						return yield* Effect.fail(
							new Unauthorized({
								message: 'Session is not valid',
							}),
						)
					}

					return CurrentUserSchema.make({
						sessionId: session.session.id,
						userId: session.user.id,
						email: session.user.email,
						name: session.user.name,
						image: session.user.image ?? null,
						emailVerified: session.user.emailVerified,
					})
				}).pipe(
					Effect.tap(() =>
						Effect.logDebug('Session validated via Better Auth middleware'),
					),
				),
		} as const
	}),
)
