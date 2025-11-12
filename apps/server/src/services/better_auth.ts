import { BetterFetchError } from '@better-fetch/fetch'
import { HttpApiError } from '@effect/platform'
import { APIError } from 'better-call'
import { Data, Effect, Schema } from 'effect'

import { Auth } from '~lib'

type AuthInstance = typeof import('~lib').auth

// Runtime schemas (core fields we rely on)
export const BetterAuthUserSchema = Schema.Struct({
	id: Schema.String,
	email: Schema.String,
	name: Schema.optional(Schema.String),
	image: Schema.NullOr(Schema.String),
	emailVerified: Schema.optional(Schema.Boolean),
})

export const BetterAuthSessionRecordSchema = Schema.Struct({
	id: Schema.String,
	userId: Schema.String,
})

export const BetterAuthGetSessionSchema = Schema.NullOr(
	Schema.Struct({
		user: BetterAuthUserSchema,
		session: BetterAuthSessionRecordSchema,
	}),
)

export type BetterAuthSession = Schema.Schema.Type<
	typeof BetterAuthGetSessionSchema
>

export class BetterAuthError extends Data.TaggedError('BetterAuthError')<{
	readonly error: unknown
}> {}

const make = Effect.gen(function* () {
	const { instance } = yield* Auth

	const call = <A>(
		f: (client: typeof instance, signal: AbortSignal) => Promise<A>,
	) =>
		Effect.tryPromise({
			try: signal => f(instance, signal),
			catch: error => new BetterAuthError({ error }),
		})

	return {
		call,
		handler: (request: Request) => call(client => client.handler(request)),
		api: {
			getSession: (headers: Headers) =>
				call(client => client.api.getSession({ headers })).pipe(
					Effect.flatMap(Schema.decodeUnknown(BetterAuthGetSessionSchema)),
				),
		},
	} as const
})

const STATUS_NAME_LOOKUP: Record<string, number> = {
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	UNPROCESSABLE_ENTITY: 422,
	TOO_MANY_REQUESTS: 429,
	INTERNAL_SERVER_ERROR: 500,
	NOT_IMPLEMENTED: 501,
	BAD_GATEWAY: 502,
}

const normalizeStatus = (status?: number | string): number => {
	if (typeof status === 'number') return status
	if (typeof status === 'string') {
		return STATUS_NAME_LOOKUP[status] ?? 500
	}
	return 500
}

const statusFromError = (error: unknown): number => {
	if (error instanceof APIError) {
		return error.statusCode ?? normalizeStatus(error.status)
	}
	if (error instanceof BetterFetchError) {
		return error.status ?? 502
	}
	if (
		typeof error === 'object' &&
		error !== null &&
		'status' in error &&
		typeof (error as { status?: unknown }).status === 'number'
	) {
		return (error as { status: number }).status
	}
	if (
		typeof error === 'object' &&
		error !== null &&
		'statusCode' in error &&
		typeof (error as { statusCode?: unknown }).statusCode === 'number'
	) {
		return (error as { statusCode: number }).statusCode
	}
	return 500
}

const httpErrorFromStatus = (status: number) => {
	switch (status) {
		case 400:
		case 422:
			return new HttpApiError.BadRequest()
		case 401:
			return new HttpApiError.Unauthorized()
		case 403:
			return new HttpApiError.Forbidden()
		case 404:
			return new HttpApiError.NotFound()
		default:
			return status >= 500
				? new HttpApiError.InternalServerError()
				: new HttpApiError.BadRequest()
	}
}

export const betterAuthStatusFromError = (error: unknown): number =>
	statusFromError(error)

export const mapBetterAuthError = (error: unknown) =>
	httpErrorFromStatus(statusFromError(error))

export class BetterAuth extends Effect.Service<BetterAuth>()('BetterAuth', {
	effect: make,
}) {}
