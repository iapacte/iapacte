import { Data, Effect } from 'effect'

import { auth } from '~lib'

export type BetterAuthSession = Awaited<ReturnType<typeof auth.api.getSession>>

export class BetterAuthError extends Data.TaggedError('BetterAuthError')<{
	readonly error: unknown
}> {}

const make = Effect.sync(() => {
	const call = <A>(
		f: (client: typeof auth, signal: AbortSignal) => Promise<A>,
	) =>
		Effect.tryPromise({
			try: signal => f(auth, signal),
			catch: error => new BetterAuthError({ error }),
		})

	return {
		call,
		handler: (request: Request) => call(client => client.handler(request)),
		api: {
			getSession: (headers: Headers) =>
				call(client => client.api.getSession({ headers })),
		},
	} as const
})

export class BetterAuth extends Effect.Service<BetterAuth>()('BetterAuth', {
	effect: make,
}) {}
