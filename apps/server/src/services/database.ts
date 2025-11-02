import { type Client, createClient } from '@libsql/client'
import { Config, Data, Effect, Redacted } from 'effect'
import { Kysely } from 'kysely'
import { LibSQLDialect } from 'kysely-turso/libsql'

export class ErrorDbConnectionFailed extends Data.TaggedError(
	'ErrorDbConnectionFailed',
)<{
	message: string
}> {}

export class ErrorDbExecutionFailed extends Data.TaggedError(
	'ErrorDbExecutionFailed',
)<{
	message: string
}> {}

type KyselyDatabase = {
	organizations: {
		id: string
		name: string
		region: string | null
		metadata: string | null
		owner_id: string
		created_at: string
		updated_at: string
	}
	organization_users: {
		id: string
		organization_id: string
		user_id: string | null
		email: string
		role: string
		status: string
		invited_at: string | null
		joined_at: string | null
		display_name: string | null
	}
	collaborations: {
		id: string
		organization_id: string
		resource_type: string
		resource_id: string
		accessible_by_type: string
		accessible_by_reference: string
		role: string
		created_at: string
		created_by: string
	}
	exemptions: {
		id: string
		organization_id: string
		subject: string
		reason: string | null
		created_at: string
		created_by: string
	}
}

const createSchema = async (kysely: Kysely<KyselyDatabase>) => {
	await kysely.schema
		.createTable('organizations')
		.ifNotExists()
		.addColumn('id', 'text', col => col.primaryKey().notNull())
		.addColumn('name', 'text', col => col.notNull())
		.addColumn('region', 'text')
		.addColumn('metadata', 'text')
		.addColumn('owner_id', 'text', col => col.notNull())
		.addColumn('created_at', 'text', col => col.notNull())
		.addColumn('updated_at', 'text', col => col.notNull())
		.execute()

	await kysely.schema
		.createTable('organization_users')
		.ifNotExists()
		.addColumn('id', 'text', col => col.primaryKey().notNull())
		.addColumn('organization_id', 'text', col => col.notNull())
		.addColumn('user_id', 'text')
		.addColumn('email', 'text', col => col.notNull())
		.addColumn('role', 'text', col => col.notNull())
		.addColumn('status', 'text', col => col.notNull())
		.addColumn('invited_at', 'text')
		.addColumn('joined_at', 'text')
		.addColumn('display_name', 'text')
		.addForeignKeyConstraint(
			'organization_users_org_fk',
			['organization_id'],
			'organizations',
			['id'],
			cb => cb.onDelete('cascade'),
		)
		.execute()

	await kysely.schema
		.createIndex('organization_users_org_idx')
		.ifNotExists()
		.on('organization_users')
		.column('organization_id')
		.execute()

	await kysely.schema
		.createIndex('organization_users_user_idx')
		.ifNotExists()
		.on('organization_users')
		.column('user_id')
		.execute()

	await kysely.schema
		.createTable('collaborations')
		.ifNotExists()
		.addColumn('id', 'text', col => col.primaryKey().notNull())
		.addColumn('organization_id', 'text', col => col.notNull())
		.addColumn('resource_type', 'text', col => col.notNull())
		.addColumn('resource_id', 'text', col => col.notNull())
		.addColumn('accessible_by_type', 'text', col => col.notNull())
		.addColumn('accessible_by_reference', 'text', col => col.notNull())
		.addColumn('role', 'text', col => col.notNull())
		.addColumn('created_at', 'text', col => col.notNull())
		.addColumn('created_by', 'text', col => col.notNull())
		.addForeignKeyConstraint(
			'collaborations_org_fk',
			['organization_id'],
			'organizations',
			['id'],
			cb => cb.onDelete('cascade'),
		)
		.execute()

	await kysely.schema
		.createIndex('collaborations_org_idx')
		.ifNotExists()
		.on('collaborations')
		.column('organization_id')
		.execute()

	await kysely.schema
		.createIndex('collaborations_resource_idx')
		.ifNotExists()
		.on('collaborations')
		.column('resource_type')
		.column('resource_id')
		.execute()

	await kysely.schema
		.createTable('exemptions')
		.ifNotExists()
		.addColumn('id', 'text', col => col.primaryKey().notNull())
		.addColumn('organization_id', 'text', col => col.notNull())
		.addColumn('subject', 'text', col => col.notNull())
		.addColumn('reason', 'text')
		.addColumn('created_at', 'text', col => col.notNull())
		.addColumn('created_by', 'text', col => col.notNull())
		.addForeignKeyConstraint(
			'exemptions_org_fk',
			['organization_id'],
			'organizations',
			['id'],
			cb => cb.onDelete('cascade'),
		)
		.execute()

	await kysely.schema
		.createIndex('exemptions_org_idx')
		.ifNotExists()
		.on('exemptions')
		.column('organization_id')
		.execute()
}

export class Database extends Effect.Service<Database>()('Database', {
	accessors: true,
	scoped: Effect.gen(function* () {
		const url = yield* Config.string('DATABASE_URL')
		const isRemoteLibsql = url.startsWith('libsql://')
		const token = isRemoteLibsql
			? yield* Config.redacted('DATABASE_TOKEN').pipe(
					Effect.orElseSucceed(() => Redacted.make('')),
				)
			: Redacted.make('')
		const authToken = Redacted.value(token)
		const clientConfig = {
			url,
			...(isRemoteLibsql && authToken ? { authToken } : {}),
		} as const

		yield* Effect.log(`Starting database connection (${url})`)

		const client: Client = createClient(clientConfig)
		const dialect = new LibSQLDialect({ client })
		const kysely = new Kysely<KyselyDatabase>({ dialect })

		yield* Effect.tryPromise(() => createSchema(kysely))

		const execute = (sql: string, params: unknown[] = []) =>
			Effect.tryPromise({
				try: () => client.execute(sql, params),
				catch: _ =>
					new ErrorDbExecutionFailed({
						message: 'Database operation failed',
					}),
			})

		const batch = (statements: string[]) =>
			Effect.tryPromise({
				try: () => client.batch(statements),
				catch: _ =>
					new ErrorDbExecutionFailed({
						message: 'Database batch operation failed',
					}),
			})

		return {
			execute,
			batch,
			client,
			kysely,
		} as const
	}),
}) {}
