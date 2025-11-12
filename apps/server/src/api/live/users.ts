import { HttpApiBuilder, HttpApiError } from '@effect/platform'
import { Effect } from 'effect'

/**
 * TODO(authz): Restore these types when authorization is back.
 */
// import type { Authorization, PermissionAction, ResourceType } from '~services'
import {
	AuthenticatedSession,
	// AuthorizationService,
	WorkspaceStore,
} from '~services'
import { GroupApiSpec } from '../specs/api.js'

const mapUserRecord = (record: {
	id: string
	email: string
	role: string
	status: 'active' | 'pending'
	invitedAt?: string
	joinedAt?: string
	displayName?: string
}) => ({
	id: record.id,
	email: record.email,
	role: record.role,
	status: record.status,
	invitedAt: record.invitedAt,
	joinedAt: record.joinedAt,
	displayName: record.displayName,
})

/*
 * TODO(authz): Re-enable permission enforcement once AuthorizationService is wired.
const ensurePermission = (
	authz: Authorization,
	userId: string,
	orgId: string,
	action: PermissionAction,
) =>
	authz
		.check({
			userId,
			action,
			resourceType: 'organization' as ResourceType,
			resourceId: orgId,
		})
		.pipe(
			Effect.catchTag('OpenFGAError', _error =>
				Effect.fail(
					new HttpApiError.InternalServerError() as HttpApiError.InternalServerError,
				),
			),
		) as Effect.Effect<
		boolean,
		HttpApiError.Forbidden | HttpApiError.InternalServerError,
		never
	>
*/

export const GroupUsersLive = HttpApiBuilder.group(
	GroupApiSpec,
	'Users',
	handlers =>
		handlers
			.handle('listUsers', ({ urlParams }) =>
				Effect.gen(function* () {
					// const user = yield* AuthenticatedSession
					yield* AuthenticatedSession
					const store = yield* WorkspaceStore
					// const authz = yield* AuthorizationService

					// TODO(authz): Enforce organization permissions when authz is ready.
					// const allowed = yield* ensurePermission(
					// 	authz,
					// 	user.userId,
					// 	urlParams.orgId,
					// 	'read',
					// )
					// if (!allowed) {
					// 	return yield* Effect.fail(new HttpApiError.Forbidden())
					// }

					const records = yield* store.listUsers(urlParams.orgId)
					return records.map(mapUserRecord)
				}),
			)
			.handle('inviteUser', ({ urlParams, payload }) =>
				Effect.gen(function* () {
					// const user = yield* AuthenticatedSession
					yield* AuthenticatedSession
					const store = yield* WorkspaceStore
					// const authz = yield* AuthorizationService

					// TODO(authz): Enforce organization permissions when authz is ready.
					// const allowed = yield* ensurePermission(
					// 	authz,
					// 	user.userId,
					// 	urlParams.orgId,
					// 	'write',
					// )
					// if (!allowed) {
					// 	return yield* Effect.fail(new HttpApiError.Forbidden())
					// }

					const inviteParams: {
						email: string
						role: string
						displayName?: string
					} = {
						email: payload.email,
						role: payload.role,
					}
					if (payload.displayName !== undefined) {
						inviteParams.displayName = payload.displayName
					}

					const record = yield* store.inviteUser(urlParams.orgId, inviteParams)

					return mapUserRecord(record)
				}),
			)
			.handle('getUser', ({ urlParams }) =>
				Effect.gen(function* () {
					// const user = yield* AuthenticatedSession
					yield* AuthenticatedSession
					const store = yield* WorkspaceStore
					// const authz = yield* AuthorizationService

					// TODO(authz): Enforce organization permissions when authz is ready.
					// const allowed = yield* ensurePermission(
					// 	authz,
					// 	user.userId,
					// 	urlParams.orgId,
					// 	'read',
					// )
					// if (!allowed) {
					// 	return yield* Effect.fail(new HttpApiError.Forbidden())
					// }

					const record = yield* store.getUser(urlParams.orgId, urlParams.userId)
					if (!record) {
						return yield* Effect.fail(new HttpApiError.NotFound())
					}

					return mapUserRecord(record)
				}),
			)
			.handle('updateUser', ({ urlParams, payload }) =>
				Effect.gen(function* () {
					// const user = yield* AuthenticatedSession
					yield* AuthenticatedSession
					const store = yield* WorkspaceStore
					// const authz = yield* AuthorizationService

					// TODO(authz): Enforce organization permissions when authz is ready.
					// const allowed = yield* ensurePermission(
					// 	authz,
					// 	user.userId,
					// 	urlParams.orgId,
					// 	'write',
					// )
					// if (!allowed) {
					// 	return yield* Effect.fail(new HttpApiError.Forbidden())
					// }

					const updateData: {
						role?: string
						status?: 'active' | 'pending'
						displayName?: string
					} = {}
					if (payload.role !== undefined) {
						updateData.role = payload.role
					}
					if (payload.status !== undefined) {
						updateData.status = payload.status
					}
					if (payload.displayName !== undefined) {
						updateData.displayName = payload.displayName
					}

					const updated = yield* store.updateUser(
						urlParams.orgId,
						urlParams.userId,
						updateData,
					)

					if (!updated) {
						return yield* Effect.fail(new HttpApiError.NotFound())
					}

					return mapUserRecord(updated)
				}),
			)
			.handle('removeUser', ({ urlParams }) =>
				Effect.gen(function* () {
					// const user = yield* AuthenticatedSession
					yield* AuthenticatedSession
					const store = yield* WorkspaceStore
					// const authz = yield* AuthorizationService

					// TODO(authz): Enforce organization permissions when authz is ready.
					// const allowed = yield* ensurePermission(
					// 	authz,
					// 	user.userId,
					// 	urlParams.orgId,
					// 	'write',
					// )
					// if (!allowed) {
					// 	return yield* Effect.fail(new HttpApiError.Forbidden())
					// }

					const removed = yield* store.removeUser(
						urlParams.orgId,
						urlParams.userId,
					)
					if (!removed) {
						return yield* Effect.fail(new HttpApiError.NotFound())
					}

					return { removed: true }
				}),
			),
)
