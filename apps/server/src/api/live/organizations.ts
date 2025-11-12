import { HttpApiBuilder, HttpApiError } from '@effect/platform'
import { Effect } from 'effect'

/**
 * TODO(authz): Restore these types when authorization checks are available.
 */
// import type { PermissionAction, ResourceType } from '~services'
import {
	AuthenticatedSession,
	// AuthorizationService,
	// OpenFGAClient,
	WorkspaceStore,
} from '~services'
import { GroupApiSpec } from '../specs/api.js'

const mapOrganizationRecord = (record: {
	id: string
	name: string
	region?: string
	metadata?: unknown
	createdAt: string
	updatedAt: string
}) => ({
	id: record.id,
	name: record.name,
	region: record.region,
	metadata: record.metadata,
	createdAt: record.createdAt,
	updatedAt: record.updatedAt,
})

export const GroupOrganizationsLive = HttpApiBuilder.group(
	GroupApiSpec,
	'Organizations',
	handlers =>
		handlers
			.handle('listOrganizations', () =>
				Effect.gen(function* () {
					const user = yield* AuthenticatedSession
					const store = yield* WorkspaceStore

					const organizations = yield* store.listOrganizationsForUser(
						user.userId,
					)

					return organizations.map(mapOrganizationRecord)
				}),
			)
			.handle('createOrganization', ({ payload }) =>
				Effect.gen(function* () {
					const user = yield* AuthenticatedSession
					const store = yield* WorkspaceStore
					// const fga = yield* OpenFGAClient

					const createData: {
						name: string
						region?: string
						metadata?: unknown
						ownerId: string
						ownerEmail?: string
					} = {
						name: payload.name,
						ownerId: user.userId,
					}
					if (payload.region !== undefined) {
						createData.region = payload.region
					}
					if (payload.metadata !== undefined) {
						createData.metadata = payload.metadata
					}
					if (user.email !== undefined) {
						createData.ownerEmail = user.email
					}

					const record = yield* store.createOrganization(createData)

					// TODO(authz): Re-enable FGA writes when authz is ready.
					// yield* fga.write([
					// 	{
					// 		user: `user:${user.userId}`,
					// 		relation: 'owner',
					// 		object: `organization:${record.id}`,
					// 	},
					// ])

					return mapOrganizationRecord(record)
				}),
			)
			.handle('getOrganization', ({ urlParams }) =>
				Effect.gen(function* () {
					// const user = yield* AuthenticatedSession
					yield* AuthenticatedSession
					const store = yield* WorkspaceStore
					// const authz = yield* AuthorizationService

					const org = yield* store.getOrganization(urlParams.orgId)
					if (!org) {
						return yield* Effect.fail(new HttpApiError.NotFound())
					}

					// TODO(authz): Enforce organization permissions when authz is ready.
					// const allowed = yield* authz.check({
					// 	userId: user.userId,
					// 	action: 'read' as PermissionAction,
					// 	resourceType: 'organization' as ResourceType,
					// 	resourceId: org.id,
					// })
					// if (!allowed) {
					// 	return yield* Effect.fail(new HttpApiError.Forbidden())
					// }

					return mapOrganizationRecord(org)
				}),
			)
			.handle('updateOrganization', ({ urlParams, payload }) =>
				Effect.gen(function* () {
					// const user = yield* AuthenticatedSession
					yield* AuthenticatedSession
					const store = yield* WorkspaceStore
					// const authz = yield* AuthorizationService

					// TODO(authz): Enforce organization permissions when authz is ready.
					// const allowed = yield* authz.check({
					// 	userId: user.userId,
					// 	action: 'write' as PermissionAction,
					// 	resourceType: 'organization' as ResourceType,
					// 	resourceId: urlParams.orgId,
					// })
					// if (!allowed) {
					// 	return yield* Effect.fail(new HttpApiError.Forbidden())
					// }

					const updateData: {
						name?: string
						region?: string
						metadata?: unknown
					} = {}
					if (payload.name !== undefined) {
						updateData.name = payload.name
					}
					if (payload.region !== undefined) {
						updateData.region = payload.region
					}
					if (payload.metadata !== undefined) {
						updateData.metadata = payload.metadata
					}

					const updated = yield* store.updateOrganization(
						urlParams.orgId,
						updateData,
					)

					if (!updated) {
						return yield* Effect.fail(new HttpApiError.NotFound())
					}

					return mapOrganizationRecord(updated)
				}),
			)
			.handle('deleteOrganization', ({ urlParams }) =>
				Effect.gen(function* () {
					// const user = yield* AuthenticatedSession
					yield* AuthenticatedSession
					const store = yield* WorkspaceStore
					// const authz = yield* AuthorizationService

					// TODO(authz): Enforce organization permissions when authz is ready.
					// const allowed = yield* authz.check({
					// 	userId: user.userId,
					// 	action: 'delete' as PermissionAction,
					// 	resourceType: 'organization' as ResourceType,
					// 	resourceId: urlParams.orgId,
					// })
					// if (!allowed) {
					// 	return yield* Effect.fail(new HttpApiError.Forbidden())
					// }

					const deleted = yield* store.deleteOrganization(urlParams.orgId)
					if (!deleted) {
						return yield* Effect.fail(new HttpApiError.NotFound())
					}

					return { deleted: true }
				}),
			),
)
