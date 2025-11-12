import { randomUUID } from 'node:crypto'
import { Context, Effect, Layer } from 'effect'

import { Database } from './database.js'

type OrganizationRecord = {
	readonly id: string
	readonly name: string
	readonly region?: string
	readonly metadata?: unknown
	readonly createdAt: string
	readonly updatedAt: string
	readonly ownerId: string
}

type OrganizationUserRecord = {
	readonly id: string
	readonly email: string
	readonly role: string
	readonly status: 'active' | 'pending'
	readonly invitedAt?: string
	readonly joinedAt?: string
	readonly displayName?: string
}

type CollaborationRecord = {
	readonly id: string
	readonly resourceType: string
	readonly resourceId: string
	readonly accessibleBy: {
		readonly type: 'user' | 'email'
		readonly reference: string
	}
	readonly role: string
	readonly createdAt: string
	readonly createdBy: string
}

type ExemptionRecord = {
	readonly id: string
	readonly subject: string
	readonly createdAt: string
	readonly createdBy: string
	readonly reason?: string
}

const parseJson = (value: string | null) => {
	if (!value) return undefined
	try {
		return JSON.parse(value) as unknown
	} catch {
		return undefined
	}
}

const serializeMetadata = (value: unknown | undefined) => {
	if (value === undefined || value === null) {
		return null
	}
	return JSON.stringify(value)
}

const make = Effect.gen(function* () {
	const db = yield* Database
	const now = () => new Date().toISOString()

	const mapOrganizationRow = (row: {
		id: string
		name: string
		region: string | null
		metadata: string | null
		owner_id: string
		created_at: string
		updated_at: string
	}): OrganizationRecord => ({
		id: row.id,
		name: row.name,
		region: row.region ?? undefined,
		metadata: parseJson(row.metadata),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		ownerId: row.owner_id,
	})

	const mapUserRow = (row: {
		id: string
		email: string
		role: string
		status: string
		invited_at: string | null
		joined_at: string | null
		display_name: string | null
	}): OrganizationUserRecord => ({
		id: row.id,
		email: row.email,
		role: row.role,
		status: row.status as 'active' | 'pending',
		invitedAt: row.invited_at ?? undefined,
		joinedAt: row.joined_at ?? undefined,
		displayName: row.display_name ?? undefined,
	})

	const mapCollaborationRow = (row: {
		id: string
		resource_type: string
		resource_id: string
		accessible_by_type: string
		accessible_by_reference: string
		role: string
		created_at: string
		created_by: string
	}): CollaborationRecord => ({
		id: row.id,
		resourceType: row.resource_type,
		resourceId: row.resource_id,
		accessibleBy: {
			type: row.accessible_by_type as 'user' | 'email',
			reference: row.accessible_by_reference,
		},
		role: row.role,
		createdAt: row.created_at,
		createdBy: row.created_by,
	})

	const mapExemptionRow = (row: {
		id: string
		subject: string
		reason: string | null
		created_at: string
		created_by: string
	}): ExemptionRecord => ({
		id: row.id,
		subject: row.subject,
		reason: row.reason ?? undefined,
		createdAt: row.created_at,
		createdBy: row.created_by,
	})

	return {
		listOrganizationsForUser: (userId: string) =>
			Effect.promise(async () => {
				const rows = await db.kysely
					.selectFrom('organizations as o')
					.selectAll('o')
					.leftJoin('organization_users as u', 'u.organization_id', 'o.id')
					.leftJoin('collaborations as c', 'c.organization_id', 'o.id')
					.where(eb =>
						eb.or([
							eb('o.owner_id', '=', userId),
							eb.and([eb('u.user_id', '=', userId)]),
							eb.and([
								eb('c.accessible_by_type', '=', 'user'),
								eb('c.accessible_by_reference', '=', userId),
							]),
						]),
					)
					.orderBy('o.created_at', 'desc')
					.execute()

				const unique = new Map<string, OrganizationRecord>()
				for (const row of rows) {
					const mapped = mapOrganizationRow(row)
					unique.set(mapped.id, mapped)
				}
				return Array.from(unique.values())
			}),

		createOrganization: (params: {
			readonly name: string
			readonly region?: string
			readonly metadata?: unknown
			readonly ownerId: string
			readonly ownerEmail?: string
		}) =>
			Effect.promise(async () => {
				const id = randomUUID()
				const timestamp = now()
				const organizationValues = {
					id,
					name: params.name,
					region: params.region ?? null,
					metadata: serializeMetadata(params.metadata),
					owner_id: params.ownerId,
					created_at: timestamp,
					updated_at: timestamp,
				}

				await db.kysely
					.insertInto('organizations')
					.values(organizationValues)
					.executeTakeFirstOrThrow()

				await db.kysely
					.insertInto('organization_users')
					.values({
						id: randomUUID(),
						organization_id: id,
						user_id: params.ownerId,
						email: params.ownerEmail ?? `${params.ownerId}@example.com`,
						role: 'owner',
						status: 'active',
						invited_at: timestamp,
						joined_at: timestamp,
						display_name: null,
					})
					.executeTakeFirstOrThrow()

				const row = await db.kysely
					.selectFrom('organizations')
					.selectAll()
					.where('id', '=', id)
					.executeTakeFirstOrThrow()

				return mapOrganizationRow(row)
			}),

		getOrganization: (orgId: string) =>
			Effect.promise(async () => {
				const row = await db.kysely
					.selectFrom('organizations')
					.selectAll()
					.where('id', '=', orgId)
					.executeTakeFirst()
				return row ? mapOrganizationRow(row) : undefined
			}),

		updateOrganization: (
			orgId: string,
			patch: Partial<Pick<OrganizationRecord, 'name' | 'region' | 'metadata'>>,
		) =>
			Effect.promise(async () => {
				const timestamp = now()
				const updateValues: Record<string, unknown> = { updated_at: timestamp }

				if ('name' in patch) {
					updateValues.name = patch.name ?? null
				}
				if ('region' in patch) {
					updateValues.region = patch.region ?? null
				}
				if ('metadata' in patch) {
					updateValues.metadata = serializeMetadata(patch.metadata)
				}

				const result = await db.kysely
					.updateTable('organizations')
					.set(updateValues)
					.where('id', '=', orgId)
					.executeTakeFirst()

				const updatedRows =
					result?.numUpdatedRows !== undefined
						? Number(result.numUpdatedRows)
						: 0

				if (updatedRows === 0) return undefined

				const row = await db.kysely
					.selectFrom('organizations')
					.selectAll()
					.where('id', '=', orgId)
					.executeTakeFirstOrThrow()

				return mapOrganizationRow(row)
			}),

		deleteOrganization: (orgId: string) =>
			Effect.promise(async () => {
				return db.kysely.transaction().execute(async trx => {
					await trx
						.deleteFrom('organization_users')
						.where('organization_id', '=', orgId)
						.executeTakeFirst()
					await trx
						.deleteFrom('collaborations')
						.where('organization_id', '=', orgId)
						.executeTakeFirst()
					await trx
						.deleteFrom('exemptions')
						.where('organization_id', '=', orgId)
						.executeTakeFirst()

					const result = await trx
						.deleteFrom('organizations')
						.where('id', '=', orgId)
						.executeTakeFirst()

					const deletedRows =
						result?.numDeletedRows !== undefined
							? Number(result.numDeletedRows)
							: 0

					return deletedRows > 0
				})
			}),

		listUsers: (orgId: string) =>
			Effect.promise(async () => {
				const rows = await db.kysely
					.selectFrom('organization_users')
					.selectAll()
					.where('organization_id', '=', orgId)
					.orderBy('invited_at', 'asc')
					.execute()

				return rows.map(mapUserRow)
			}),

		getUser: (orgId: string, userId: string) =>
			Effect.promise(async () => {
				const row = await db.kysely
					.selectFrom('organization_users')
					.selectAll()
					.where('organization_id', '=', orgId)
					.where('id', '=', userId)
					.executeTakeFirst()

				return row ? mapUserRow(row) : undefined
			}),

		inviteUser: (
			orgId: string,
			params: {
				readonly email: string
				readonly role: string
				readonly displayName?: string
			},
		) =>
			Effect.promise(async () => {
				const id = randomUUID()
				const timestamp = now()

				await db.kysely
					.insertInto('organization_users')
					.values({
						id,
						organization_id: orgId,
						user_id: null,
						email: params.email,
						role: params.role,
						status: 'pending',
						invited_at: timestamp,
						joined_at: null,
						display_name: params.displayName ?? null,
					})
					.executeTakeFirstOrThrow()

				const row = await db.kysely
					.selectFrom('organization_users')
					.selectAll()
					.where('organization_id', '=', orgId)
					.where('id', '=', id)
					.executeTakeFirstOrThrow()

				return mapUserRow(row)
			}),

		updateUser: (
			orgId: string,
			userId: string,
			patch: Partial<
				Pick<OrganizationUserRecord, 'role' | 'status' | 'displayName'>
			>,
		) =>
			Effect.promise(async () => {
				const current = await db.kysely
					.selectFrom('organization_users')
					.selectAll()
					.where('organization_id', '=', orgId)
					.where('id', '=', userId)
					.executeTakeFirst()

				if (!current) return undefined

				const updateValues: Record<string, unknown> = {}

				if ('role' in patch) {
					updateValues.role = patch.role ?? null
				}

				if ('status' in patch) {
					updateValues.status = patch.status ?? current.status
					if (patch.status === 'active' && current.joined_at === null) {
						updateValues.joined_at = now()
					}
				}

				if ('displayName' in patch) {
					updateValues.display_name = patch.displayName ?? null
				}

				if (Object.keys(updateValues).length > 0) {
					await db.kysely
						.updateTable('organization_users')
						.set(updateValues)
						.where('organization_id', '=', orgId)
						.where('id', '=', userId)
						.executeTakeFirst()
				}

				const row = await db.kysely
					.selectFrom('organization_users')
					.selectAll()
					.where('organization_id', '=', orgId)
					.where('id', '=', userId)
					.executeTakeFirstOrThrow()

				return mapUserRow(row)
			}),

		removeUser: (orgId: string, userId: string) =>
			Effect.promise(async () => {
				const result = await db.kysely
					.deleteFrom('organization_users')
					.where('organization_id', '=', orgId)
					.where('id', '=', userId)
					.executeTakeFirst()

				const deletedRows =
					result?.numDeletedRows !== undefined
						? Number(result.numDeletedRows)
						: 0

				return deletedRows > 0
			}),

		createCollaboration: (
			orgId: string,
			params: {
				readonly resourceType: string
				readonly resourceId: string
				readonly accessibleBy: {
					readonly type: 'user' | 'email'
					readonly reference: string
				}
				readonly role: string
				readonly createdBy: string
			},
		) =>
			Effect.promise(async () => {
				const id = randomUUID()
				const timestamp = now()

				await db.kysely
					.insertInto('collaborations')
					.values({
						id,
						organization_id: orgId,
						resource_type: params.resourceType,
						resource_id: params.resourceId,
						accessible_by_type: params.accessibleBy.type,
						accessible_by_reference: params.accessibleBy.reference,
						role: params.role,
						created_at: timestamp,
						created_by: params.createdBy,
					})
					.executeTakeFirstOrThrow()

				const row = await db.kysely
					.selectFrom('collaborations')
					.selectAll()
					.where('organization_id', '=', orgId)
					.where('id', '=', id)
					.executeTakeFirstOrThrow()

				return mapCollaborationRow(row)
			}),

		listCollaborations: (
			orgId: string,
			resourceType: string,
			resourceId: string,
		) =>
			Effect.promise(async () => {
				const rows = await db.kysely
					.selectFrom('collaborations')
					.selectAll()
					.where('organization_id', '=', orgId)
					.where('resource_type', '=', resourceType)
					.where('resource_id', '=', resourceId)
					.orderBy('created_at', 'asc')
					.execute()

				return rows.map(mapCollaborationRow)
			}),

		getCollaboration: (orgId: string, collabId: string) =>
			Effect.promise(async () => {
				const row = await db.kysely
					.selectFrom('collaborations')
					.selectAll()
					.where('organization_id', '=', orgId)
					.where('id', '=', collabId)
					.executeTakeFirst()

				return row ? mapCollaborationRow(row) : undefined
			}),

		updateCollaboration: (
			orgId: string,
			collabId: string,
			patch: Partial<Pick<CollaborationRecord, 'role'>>,
		) =>
			Effect.promise(async () => {
				const updateValues: Record<string, unknown> = {}

				if ('role' in patch) {
					updateValues.role = patch.role ?? null
				}

				if (Object.keys(updateValues).length > 0) {
					await db.kysely
						.updateTable('collaborations')
						.set(updateValues)
						.where('organization_id', '=', orgId)
						.where('id', '=', collabId)
						.executeTakeFirst()
				}

				const row = await db.kysely
					.selectFrom('collaborations')
					.selectAll()
					.where('organization_id', '=', orgId)
					.where('id', '=', collabId)
					.executeTakeFirst()

				return row ? mapCollaborationRow(row) : undefined
			}),

		deleteCollaboration: (orgId: string, collabId: string) =>
			Effect.promise(async () => {
				const result = await db.kysely
					.deleteFrom('collaborations')
					.where('organization_id', '=', orgId)
					.where('id', '=', collabId)
					.executeTakeFirst()

				const deletedRows =
					result?.numDeletedRows !== undefined
						? Number(result.numDeletedRows)
						: 0

				return deletedRows > 0
			}),

		createExemption: (
			orgId: string,
			params: {
				readonly subject: string
				readonly reason?: string
				readonly createdBy: string
			},
		) =>
			Effect.promise(async () => {
				const id = randomUUID()
				const timestamp = now()

				await db.kysely
					.insertInto('exemptions')
					.values({
						id,
						organization_id: orgId,
						subject: params.subject,
						reason: params.reason ?? null,
						created_at: timestamp,
						created_by: params.createdBy,
					})
					.executeTakeFirstOrThrow()

				const row = await db.kysely
					.selectFrom('exemptions')
					.selectAll()
					.where('organization_id', '=', orgId)
					.where('id', '=', id)
					.executeTakeFirstOrThrow()

				return mapExemptionRow(row)
			}),

		listExemptions: (orgId: string) =>
			Effect.promise(async () => {
				const rows = await db.kysely
					.selectFrom('exemptions')
					.selectAll()
					.where('organization_id', '=', orgId)
					.orderBy('created_at', 'desc')
					.execute()

				return rows.map(mapExemptionRow)
			}),
	} as const
})

export class WorkspaceStore extends Context.Tag('WorkspaceStore')<
	WorkspaceStore,
	Effect.Effect.Success<typeof make>
>() {
	static readonly Live = Layer.effect(this, make)
}
