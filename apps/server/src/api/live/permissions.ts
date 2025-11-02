import { HttpApiBuilder, HttpApiError } from '@effect/platform'
import { Effect } from 'effect'

import type { PermissionAction, ResourceType, Authorization } from '~services'
import {
	AuthenticatedSession,
	AuthorizationService,
	WorkspaceStore,
} from '~services'
import { GroupApiSpec } from '../specs/api.js'

const mapCollaboration = (record: {
	id: string
	resourceType: string
	resourceId: string
	accessibleBy: { type: 'user' | 'email'; reference: string }
	role: string
	createdAt: string
	createdBy: string
}) => ({
	id: record.id,
	resourceType: record.resourceType,
	resourceId: record.resourceId,
	accessibleBy: record.accessibleBy,
	role: record.role,
	createdAt: record.createdAt,
	createdBy: record.createdBy,
})

const mapExemption = (record: {
	id: string
	subject: string
	createdAt: string
	createdBy: string
	reason?: string
}) => ({
	id: record.id,
	subject: record.subject,
	createdAt: record.createdAt,
	createdBy: record.createdBy,
	reason: record.reason,
})

const ensurePermission = (
	authz: Authorization,
	params: {
		userId: string
		action: PermissionAction
		resourceType: ResourceType
		resourceId: string
	},
) =>
	authz.check({
		userId: params.userId,
		action: params.action,
		resourceType: params.resourceType,
		resourceId: params.resourceId,
	})

export const GroupPermissionsLive = HttpApiBuilder.group(
	GroupApiSpec,
	'Permissions',
	handlers =>
		handlers
			.handle('createCollaboration', ({ urlParams, body }) =>
				Effect.gen(function* () {
					const { session } = yield* AuthenticatedSession
					const store = yield* WorkspaceStore
					const authz = yield* AuthorizationService

					const userId = session?.user?.id
					if (!userId) {
						return yield* Effect.fail(new HttpApiError.Unauthorized())
					}

					const allowed = yield* ensurePermission(authz, {
						userId,
						action: 'share' as PermissionAction,
						resourceType: body.resourceType as ResourceType,
						resourceId: body.resourceId,
					})

					if (!allowed) {
						return yield* Effect.fail(new HttpApiError.Forbidden())
					}

					const record = yield* store.createCollaboration(urlParams.orgId, {
						resourceType: body.resourceType,
						resourceId: body.resourceId,
						accessibleBy: body.accessibleBy,
						role: body.role,
						createdBy: userId,
					})

					return mapCollaboration(record)
				}),
			)
			.handle('listResourceCollaborations', ({ urlParams }) =>
				Effect.gen(function* () {
					const { session } = yield* AuthenticatedSession
					const store = yield* WorkspaceStore
					const authz = yield* AuthorizationService

					const userId = session?.user?.id
					if (!userId) {
						return yield* Effect.fail(new HttpApiError.Unauthorized())
					}

					const allowed = yield* ensurePermission(authz, {
						userId,
						action: 'read' as PermissionAction,
						resourceType: urlParams.resourceType as ResourceType,
						resourceId: urlParams.resourceId,
					})

					if (!allowed) {
						return yield* Effect.fail(new HttpApiError.Forbidden())
					}

					const items = yield* store.listCollaborations(
						urlParams.orgId,
						urlParams.resourceType,
						urlParams.resourceId,
					)

					return items.map(mapCollaboration)
				}),
			)
			.handle('updateCollaboration', ({ urlParams, body }) =>
				Effect.gen(function* () {
					const { session } = yield* AuthenticatedSession
					const store = yield* WorkspaceStore
					const authz = yield* AuthorizationService

					const userId = session?.user?.id
					if (!userId) {
						return yield* Effect.fail(new HttpApiError.Unauthorized())
					}

					const existing = yield* store.getCollaboration(
						urlParams.orgId,
						urlParams.collabId,
					)
					if (!existing) {
						return yield* Effect.fail(new HttpApiError.NotFound())
					}

					const allowed = yield* ensurePermission(authz, {
						userId,
						action: 'share' as PermissionAction,
						resourceType: existing.resourceType as ResourceType,
						resourceId: existing.resourceId,
					})

					if (!allowed) {
						return yield* Effect.fail(new HttpApiError.Forbidden())
					}

					const updated = yield* store.updateCollaboration(
						urlParams.orgId,
						urlParams.collabId,
						{
							role: body.role,
						},
					)

					if (!updated) {
						return yield* Effect.fail(new HttpApiError.NotFound())
					}

					return mapCollaboration(updated)
				}),
			)
			.handle('deleteCollaboration', ({ urlParams }) =>
				Effect.gen(function* () {
					const { session } = yield* AuthenticatedSession
					const store = yield* WorkspaceStore
					const authz = yield* AuthorizationService

					const userId = session?.user?.id
					if (!userId) {
						return yield* Effect.fail(new HttpApiError.Unauthorized())
					}

					const existing = yield* store.getCollaboration(
						urlParams.orgId,
						urlParams.collabId,
					)
					if (!existing) {
						return yield* Effect.fail(new HttpApiError.NotFound())
					}

					const allowed = yield* ensurePermission(authz, {
						userId,
						action: 'share' as PermissionAction,
						resourceType: existing.resourceType as ResourceType,
						resourceId: existing.resourceId,
					})

					if (!allowed) {
						return yield* Effect.fail(new HttpApiError.Forbidden())
					}

					const deleted = yield* store.deleteCollaboration(
						urlParams.orgId,
						urlParams.collabId,
					)
					if (!deleted) {
						return yield* Effect.fail(new HttpApiError.NotFound())
					}

					return { deleted: true }
				}),
			)
			.handle('createExemption', ({ urlParams, body }) =>
				Effect.gen(function* () {
					const { session } = yield* AuthenticatedSession
					const store = yield* WorkspaceStore
					const authz = yield* AuthorizationService

					const userId = session?.user?.id
					if (!userId) {
						return yield* Effect.fail(new HttpApiError.Unauthorized())
					}

					const allowed = yield* ensurePermission(authz, {
						userId,
						action: 'share' as PermissionAction,
						resourceType: 'organization' as ResourceType,
						resourceId: urlParams.orgId,
					})

					if (!allowed) {
						return yield* Effect.fail(new HttpApiError.Forbidden())
					}

					const record = yield* store.createExemption(urlParams.orgId, {
						subject: body.subject,
						reason: body.reason,
						createdBy: userId,
					})

					return mapExemption(record)
				}),
			)
			.handle('listExemptions', ({ urlParams }) =>
				Effect.gen(function* () {
					const { session } = yield* AuthenticatedSession
					const store = yield* WorkspaceStore
					const authz = yield* AuthorizationService

					const userId = session?.user?.id
					if (!userId) {
						return yield* Effect.fail(new HttpApiError.Unauthorized())
					}

					const allowed = yield* ensurePermission(authz, {
						userId,
						action: 'read' as PermissionAction,
						resourceType: 'organization' as ResourceType,
						resourceId: urlParams.orgId,
					})

					if (!allowed) {
						return yield* Effect.fail(new HttpApiError.Forbidden())
					}

					const items = yield* store.listExemptions(urlParams.orgId)
					return items.map(mapExemption)
				}),
			),
)
