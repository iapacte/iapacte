import { Effect } from 'effect'
import * as Config from 'effect/Config'

export class EnvVars extends Effect.Service<EnvVars>()('EnvVars', {
	effect: Effect.gen(function* () {
		return {
			NODE_ENV: yield* Config.string('NODE_ENV').pipe(
				Config.withDefault('development'),
			),
			BETTER_AUTH_SECRET: yield* Config.string('BETTER_AUTH_SECRET'),
			BETTER_AUTH_BASE_URL: yield* Config.string('BETTER_AUTH_BASE_URL').pipe(
				Config.orElse(() => Config.succeed(undefined)),
			),
			BETTER_AUTH_COOKIE_DOMAIN: yield* Config.string(
				'BETTER_AUTH_COOKIE_DOMAIN',
			).pipe(Config.orElse(() => Config.succeed(undefined))),
			BETTER_AUTH_INSECURE_COOKIES: yield* Config.boolean(
				'BETTER_AUTH_INSECURE_COOKIES',
			).pipe(Config.withDefault(false)),
			DATABASE_AUTH_URL: yield* Config.string('DATABASE_AUTH_URL'),
			DATABASE_AUTH_SECRET: yield* Config.string('DATABASE_AUTH_SECRET'),
			ALLOWED_ORIGINS: yield* Config.string('ALLOWED_ORIGINS').pipe(
				Config.orElse(() => Config.succeed('')),
				Config.map(value =>
					value
						? value
								.split(',')
								.map(s => s.trim())
								.filter(Boolean)
						: [],
				),
			),
		} as const
	}),
}) {}
