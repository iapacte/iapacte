import { logAppServer } from '@aipacto/shared-utils-logging'
import {
	CredentialsMethod,
	type FgaObject,
	OpenFgaClient as SDKClient,
} from '@openfga/sdk'
import { Config, Effect } from 'effect'

import { OpenFGAError } from './authz_errors.js'

type Tuple = {
	readonly user: string
	readonly relation: string
	readonly object: string
}

interface CheckParams extends Tuple {
	readonly contextualTuples?: ReadonlyArray<Tuple>
}

interface ListObjectsParams {
	readonly user: string
	readonly relation: string
	readonly type: string
}

interface ListUsersParams {
	readonly object: FgaObject
	readonly relation: string
	readonly userFilter?: { readonly type: string; readonly relation?: string }
}

interface BatchCheckItem extends Tuple {
	readonly correlationId?: string
}

const make = Effect.gen(function* () {
	const apiUrl = yield* Config.string('OPENFGA_API_URL')
	const storeId = yield* Config.string('OPENFGA_STORE_ID')
	const apiToken = yield* Config.string('OPENFGA_API_TOKEN')

	logAppServer.debug('Initializing OpenFGA client...')

	const client = new SDKClient({
		apiUrl,
		storeId,
		credentials: apiToken
			? {
					method: CredentialsMethod.ApiToken,
					config: { token: apiToken },
				}
			: undefined,
	})

	yield* Effect.tryPromise({
		try: async () => {
			await client.readLatestAuthorizationModel()
			logAppServer.debug('Successfully connected to OpenFGA')
		},
		catch: error =>
			new OpenFGAError({
				operation: 'checkConnection',
				error,
			}),
	})

	return {
		check: (params: CheckParams) =>
			Effect.tryPromise({
				try: async () => {
					const result = await client.check({
						user: params.user,
						relation: params.relation,
						object: params.object,
						contextualTuples: Array.from(params.contextualTuples ?? []),
					})
					return result.allowed ?? false
				},
				catch: error =>
					new OpenFGAError({
						operation: 'check',
						error,
					}),
			}),

		write: (writes: ReadonlyArray<Tuple>) =>
			Effect.tryPromise({
				try: async () => {
					await client.write({ writes: Array.from(writes) })
					return undefined
				},
				catch: error =>
					new OpenFGAError({
						operation: 'write',
						error,
					}),
			}),

		delete: (deletes: ReadonlyArray<Tuple>) =>
			Effect.tryPromise({
				try: async () => {
					await client.write({ deletes: Array.from(deletes) })
					return undefined
				},
				catch: error =>
					new OpenFGAError({
						operation: 'delete',
						error,
					}),
			}),

		batchCheck: (checks: ReadonlyArray<BatchCheckItem>) =>
			Effect.tryPromise({
				try: async () => {
					const checksWithIds = checks.map((item, index) => ({
						...item,
						correlationId: item.correlationId ?? `check-${index}`,
					}))

					const result = await client.batchCheck({
						checks: checksWithIds.map(item => ({
							user: item.user,
							relation: item.relation,
							object: item.object,
							correlationId: item.correlationId ?? '',
						})),
					})

					return checksWithIds.map(item => {
						const correlationId = item.correlationId ?? ''
						const found = result.result.find(
							r => r.correlationId === correlationId,
						)
						return {
							correlationId,
							allowed: found?.allowed ?? false,
						}
					})
				},
				catch: error =>
					new OpenFGAError({
						operation: 'batchCheck',
						error,
					}),
			}),

		listObjects: (params: ListObjectsParams) =>
			Effect.tryPromise({
				try: async () => {
					const result = await client.listObjects({
						user: params.user,
						relation: params.relation,
						type: params.type,
					})
					return result.objects ?? []
				},
				catch: error =>
					new OpenFGAError({
						operation: 'listObjects',
						error,
					}),
			}),

		listUsers: (params: ListUsersParams) =>
			Effect.tryPromise({
				try: async () => {
					const result = await client.listUsers({
						object: params.object,
						relation: params.relation,
						user_filters: params.userFilter ? [params.userFilter] : [],
					})

					return (
						result.users
							?.map(user => {
								if (user.object) {
									return `${user.object.type}:${user.object.id}`
								}
								if (user.userset) {
									return `${user.userset.type}:${user.userset.id}#${user.userset.relation}`
								}
								if (user.wildcard) {
									return `${user.wildcard.type}:*`
								}
								return ''
							})
							.filter(Boolean) ?? []
					)
				},
				catch: error =>
					new OpenFGAError({
						operation: 'listUsers',
						error,
					}),
			}),
	}
})

export type OpenFGA = Effect.Effect.Success<typeof make>

export class OpenFGAClient extends Effect.Service<OpenFGAClient>()(
	'OpenFGAClient',
	{
		effect: make,
	},
) {}
