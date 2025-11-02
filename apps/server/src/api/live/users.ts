import { HttpApiBuilder, HttpApiError } from '@effect/platform'
import { Effect } from 'effect'

import type { PermissionAction, ResourceType, Authorization } from '~services'
import {
	AuthenticatedSession,
	AuthorizationService,
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

const ensurePermission = (
	authz: Authorization,
	userId: string,
	orgId: string,
	action: PermissionAction,
) =>
	authz.check({
		userId,
		action,
		resourceType: 'organization' as ResourceType,
		resourceId: orgId,
	})

export const GroupUsersLive = HttpApiBuilder.group(
	GroupApiSpec,
	'Users',
	handlers =>
		handlers
			.handle('listUsers', ({ urlParams }) =>
				Effect.gen(function* () {
					const { session } = yield* AuthenticatedSession
					const store = yield* WorkspaceStore
					const authz = yield* AuthorizationService

					const userId = session?.user?.id
					if (!userId) {
						return yield* Effect.fail(new HttpApiError.Unauthorized())
					}

					const allowed = yield* ensurePermission(
						authz,
						userId,
						urlParams.orgId,
						'read',
					)
					if (!allowed) {
						return yield* Effect.fail(new HttpApiError.Forbidden())
					}

					const records = yield* store.listUsers(urlParams.orgId)
					return records.map(mapUserRecord)
				}),
			)
			.handle('inviteUser', ({ urlParams, body }) =>
				Effect.gen(function* () {
					const { session } = yield* AuthenticatedSession
					const store = yield* WorkspaceStore
					const authz = yield* AuthorizationService

					const userId = session?.user?.id
					if (!userId) {
						return yield* Effect.fail(new HttpApiError.Unauthorized())
					}

					const allowed = yield* ensurePermission(
						authz,
						userId,
						urlParams.orgId,
						'write',
					)
					if (!allowed) {
						return yield* Effect.fail(new HttpApiError.Forbidden())
					}

					const record = yield* store.inviteUser(urlParams.orgId, {
						email: body.email,
						role: body.role,
						displayName: body.displayName,
					})

					return mapUserRecord(record)
				}),
			)
			.handle('getUser', ({ urlParams }) =>
				Effect.gen(function* () {
					const { session } = yield* AuthenticatedSession
					const store = yield* WorkspaceStore
					const authz = yield* AuthorizationService

					const userId = session?.user?.id
					if (!userId) {
						return yield* Effect.fail(new HttpApiError.Unauthorized())
					}

					const allowed = yield* ensurePermission(
						authz,
						userId,
						urlParams.orgId,
						'read',
					)
					if (!allowed) {
						return yield* Effect.fail(new HttpApiError.Forbidden())
					}

					const record = yield* store.getUser(urlParams.orgId, urlParams.userId)
					if (!record) {
						return yield* Effect.fail(new HttpApiError.NotFound())
					}

					return mapUserRecord(record)
				}),
			)
			.handle('updateUser', ({ urlParams, body }) =>
				Effect.gen(function* () {
					const { session } = yield* AuthenticatedSession
					const store = yield* WorkspaceStore
					const authz = yield* AuthorizationService

					const userId = session?.user?.id
					if (!userId) {
						return yield* Effect.fail(new HttpApiError.Unauthorized())
					}

					const allowed = yield* ensurePermission(
						authz,
						userId,
						urlParams.orgId,
						'write',
					)
					if (!allowed) {
						return yield* Effect.fail(new HttpApiError.Forbidden())
					}

					const updated = yield* store.updateUser(
						urlParams.orgId,
						urlParams.userId,
						{
							role: body.role,
							status: body.status,
							displayName: body.displayName,
						},
					)

					if (!updated) {
						return yield* Effect.fail(new HttpApiError.NotFound())
					}

					return mapUserRecord(updated)
				}),
			)
			.handle('removeUser', ({ urlParams }) =>
				Effect.gen(function* () {
					const { session } = yield* AuthenticatedSession
					const store = yield* WorkspaceStore
					const authz = yield* AuthorizationService

					const userId = session?.user?.id
					if (!userId) {
						return yield* Effect.fail(new HttpApiError.Unauthorized())
					}

					const allowed = yield* ensurePermission(
						authz,
						userId,
						urlParams.orgId,
						'write',
					)
					if (!allowed) {
						return yield* Effect.fail(new HttpApiError.Forbidden())
					}

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
