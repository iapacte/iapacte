import { HttpApiBuilder, HttpApiError } from '@effect/platform'
import { Effect } from 'effect'

import type { PermissionAction, ResourceType } from '~services'
import {
	AuthenticatedSession,
	OpenFGAClient,
	AuthorizationService,
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
					const { session } = yield* AuthenticatedSession
					const store = yield* WorkspaceStore

					const userId = session?.user?.id
					if (!userId) {
						return yield* Effect.fail(new HttpApiError.Unauthorized())
					}

					const organizations = yield* store.listOrganizationsForUser(userId)

					return organizations.map(mapOrganizationRecord)
				}),
			)
			.handle('createOrganization', ({ body }) =>
				Effect.gen(function* () {
					const { session } = yield* AuthenticatedSession
					const store = yield* WorkspaceStore
					const fga = yield* OpenFGAClient

					const ownerId = session?.user?.id
					if (!ownerId) {
						return yield* Effect.fail(new HttpApiError.Unauthorized())
					}

					const record = yield* store.createOrganization({
						name: body.name,
						region: body.region,
						metadata: body.metadata,
						ownerId,
						ownerEmail: session.user?.email ?? undefined,
					})

					yield* fga.write([
						{
							user: `user:${ownerId}`,
							relation: 'owner',
							object: `organization:${record.id}`,
						},
					])

					return mapOrganizationRecord(record)
				}),
			)
			.handle('getOrganization', ({ urlParams }) =>
				Effect.gen(function* () {
					const { session } = yield* AuthenticatedSession
					const store = yield* WorkspaceStore
					const authz = yield* AuthorizationService

					const userId = session?.user?.id
					if (!userId) {
						return yield* Effect.fail(new HttpApiError.Unauthorized())
					}

					const org = yield* store.getOrganization(urlParams.orgId)
					if (!org) {
						return yield* Effect.fail(new HttpApiError.NotFound())
					}

					const allowed = yield* authz.check({
						userId,
						action: 'read' as PermissionAction,
						resourceType: 'organization' as ResourceType,
						resourceId: org.id,
					})

					if (!allowed) {
						return yield* Effect.fail(new HttpApiError.Forbidden())
					}

					return mapOrganizationRecord(org)
				}),
			)
			.handle('updateOrganization', ({ urlParams, body }) =>
				Effect.gen(function* () {
					const { session } = yield* AuthenticatedSession
					const store = yield* WorkspaceStore
					const authz = yield* AuthorizationService

					const userId = session?.user?.id
					if (!userId) {
						return yield* Effect.fail(new HttpApiError.Unauthorized())
					}

					const allowed = yield* authz.check({
						userId,
						action: 'write' as PermissionAction,
						resourceType: 'organization' as ResourceType,
						resourceId: urlParams.orgId,
					})

					if (!allowed) {
						return yield* Effect.fail(new HttpApiError.Forbidden())
					}

					const updated = yield* store.updateOrganization(urlParams.orgId, {
						name: body.name,
						region: body.region,
						metadata: body.metadata,
					})

					if (!updated) {
						return yield* Effect.fail(new HttpApiError.NotFound())
					}

					return mapOrganizationRecord(updated)
				}),
			)
			.handle('deleteOrganization', ({ urlParams }) =>
				Effect.gen(function* () {
					const { session } = yield* AuthenticatedSession
					const store = yield* WorkspaceStore
					const authz = yield* AuthorizationService

					const userId = session?.user?.id
					if (!userId) {
						return yield* Effect.fail(new HttpApiError.Unauthorized())
					}

					const allowed = yield* authz.check({
						userId,
						action: 'delete' as PermissionAction,
						resourceType: 'organization' as ResourceType,
						resourceId: urlParams.orgId,
					})

					if (!allowed) {
						return yield* Effect.fail(new HttpApiError.Forbidden())
					}

					const deleted = yield* store.deleteOrganization(urlParams.orgId)
					if (!deleted) {
						return yield* Effect.fail(new HttpApiError.NotFound())
					}

					return { deleted: true }
				}),
			),
)
