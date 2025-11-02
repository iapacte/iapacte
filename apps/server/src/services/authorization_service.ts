import { Context, Effect, Layer } from 'effect'

import { AuthorizationCheckError } from './authz_errors.js'
import type {
	PermissionAction,
	PermissionLevel,
	ResourceType,
} from './authz_types.js'
import { OpenFGAClient } from './openfga_client.js'

const make = Effect.gen(function* () {
	const fga = yield* OpenFGAClient

	const service = {
		check: (params: {
			readonly userId: string
			readonly action: PermissionAction
			readonly resourceType: ResourceType
			readonly resourceId: string
		}) =>
			Effect.gen(function* () {
				const relation = mapActionToRelation(params.action, params.resourceType)

				const allowed = yield* fga.check({
					user: `user:${params.userId}`,
					relation,
					object: `${params.resourceType}:${params.resourceId}`,
				})

				if (!allowed) {
					yield* Effect.log(
						`Access denied: ${params.userId} cannot ${params.action} ${params.resourceType}:${params.resourceId}`,
					)
				}

				return allowed
			}),

		filterByPermission: <T extends { readonly id: string }>(params: {
			readonly userId: string
			readonly action: PermissionAction
			readonly resourceType: ResourceType
			readonly resources: ReadonlyArray<T>
		}) =>
			Effect.gen(function* () {
				if (params.resources.length === 0) return []

				const relation = mapActionToRelation(params.action, params.resourceType)

				const checks = params.resources.map((resource, index) => ({
					user: `user:${params.userId}`,
					relation,
					object: `${params.resourceType}:${resource.id}`,
					correlationId: `resource-${index}`,
				}))

				const results = yield* fga.batchCheck(checks)

				const allowedMap = new Map(
					results.map(result => [result.correlationId, result.allowed]),
				)

				return params.resources.filter(
					(_, index) => allowedMap.get(`resource-${index}`) ?? false,
				)
			}),

		grant: (params: {
			readonly grantorId: string
			readonly granteeType: 'user' | 'group'
			readonly granteeId: string
			readonly resourceType: ResourceType
			readonly resourceId: string
			readonly level: PermissionLevel
		}) =>
			Effect.gen(function* () {
				const canShare = yield* service.check({
					userId: params.grantorId,
					action: 'share',
					resourceType: params.resourceType,
					resourceId: params.resourceId,
				})

				if (!canShare) {
					return yield* Effect.fail(
						new AuthorizationCheckError({
							message: 'User cannot share this resource',
							userId: params.grantorId,
							action: 'share',
							resource: `${params.resourceType}:${params.resourceId}`,
						}),
					)
				}

				const relation = mapPermissionLevelToRelation(params.level)

				const user =
					params.granteeType === 'group'
						? `group:${params.granteeId}#member`
						: `user:${params.granteeId}`

				yield* fga.write([
					{
						user,
						relation,
						object: `${params.resourceType}:${params.resourceId}`,
					},
				])

				yield* Effect.log(
					`Granted ${params.level} on ${params.resourceType}:${params.resourceId} to ${user}`,
				)
			}),

		revoke: (params: {
			readonly revokerId: string
			readonly granteeType: 'user' | 'group'
			readonly granteeId: string
			readonly resourceType: ResourceType
			readonly resourceId: string
		}) =>
			Effect.gen(function* () {
				const canShare = yield* service.check({
					userId: params.revokerId,
					action: 'share',
					resourceType: params.resourceType,
					resourceId: params.resourceId,
				})

				if (!canShare) {
					return yield* Effect.fail(
						new AuthorizationCheckError({
							message: 'User cannot manage permissions for this resource',
							userId: params.revokerId,
							action: 'share',
							resource: `${params.resourceType}:${params.resourceId}`,
						}),
					)
				}

				const user =
					params.granteeType === 'group'
						? `group:${params.granteeId}#member`
						: `user:${params.granteeId}`

				const relations = ['viewer', 'commenter', 'editor', 'owner']
				const deletes =
					params.resourceType === 'folder'
						? [...relations, 'contributor']
						: relations

				yield* fga.delete(
					deletes.map(relation => ({
						user,
						relation,
						object: `${params.resourceType}:${params.resourceId}`,
					})),
				)

				yield* Effect.log(
					`Revoked all permissions on ${params.resourceType}:${params.resourceId} from ${user}`,
				)
			}),

		listAccessibleResources: (params: {
			readonly userId: string
			readonly resourceType: ResourceType
			readonly action: PermissionAction
		}) =>
			Effect.gen(function* () {
				const relation = mapActionToRelation(params.action, params.resourceType)

				const objects = yield* fga.listObjects({
					user: `user:${params.userId}`,
					relation,
					type: params.resourceType,
				})

				return objects.map(object => object.split(':')[1] ?? '')
			}),

		listResourceUsers: (params: {
			readonly resourceType: ResourceType
			readonly resourceId: string
			readonly action: PermissionAction
		}) =>
			Effect.gen(function* () {
				const relation = mapActionToRelation(params.action, params.resourceType)

				const users = yield* fga.listUsers({
					object: {
						type: params.resourceType,
						id: params.resourceId,
					},
					relation,
					userFilter: { type: 'user' },
				})

				return users
					.filter(user => user.startsWith('user:'))
					.map(user => user.replace('user:', ''))
			}),
	}

	return service
})

export type Authorization = Effect.Effect.Success<typeof make>

function mapActionToRelation(
	action: PermissionAction,
	resourceType: ResourceType,
): string {
	switch (action) {
		case 'read':
			return resourceType === 'folder' ? 'can_view_content' : 'can_read'
		case 'write':
			return resourceType === 'folder' ? 'can_create_file' : 'can_write'
		case 'delete':
			return 'can_delete'
		case 'share':
			return 'can_share'
		case 'change_owner':
			return 'can_change_owner'
		default:
			return 'can_read'
	}
}

function mapPermissionLevelToRelation(level: PermissionLevel): string {
	switch (level) {
		case 'owner':
			return 'owner'
		case 'editor':
			return 'editor'
		case 'commenter':
			return 'commenter'
		case 'viewer':
			return 'viewer'
		default:
			return 'viewer'
	}
}

export class AuthorizationService extends Context.Tag('AuthorizationService')<
	AuthorizationService,
	Authorization
>() {
	static readonly Live = Layer.effect(AuthorizationService, make)
}
