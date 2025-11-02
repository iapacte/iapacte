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

export class Database extends Effect.Service<Database>()('Database', {
	accessors: true,
	scoped: Effect.gen(function* () {
		const url = yield* Config.string('DATABASE_URL')

		Effect.log('Starting database connection')

		let client: Client
		// Use auth token only for remote libsql (Turso); local file: URLs never need it.
		const isRemoteLibsql = url.startsWith('libsql://')
		if (isRemoteLibsql) {
			const authToken = yield* Config.redacted('DATABASE_TOKEN').pipe(
				Effect.orElseSucceed(() => Redacted.make('')),
			)

			client = createClient({
				url,
				// Some libsql servers can accept empty token (local/dev); pass only if present
				...(Redacted.value(authToken)
					? { authToken: Redacted.value(authToken) }
					: {}),
			})
		} else {
			client = createClient({
				url,
			})
		}

		// Initialize Kysely with LibSQL dialect
		type KyselyDatabase = {
			documents: {
				id: string
				snapshot: Uint8Array
			}
			document_history: {
				doc_id: string
				version_id: string
				version: string // JSON serialized VersionVector
				timestamp: number
				author: string
				message: string | null
			}
			diagrams: {
				id: string
				snapshot: Uint8Array
			}
			diagram_history: {
				diag_id: string
				version_id: string
				version: string
				timestamp: number
				author: string
				message: string | null
			}
		}

		const dialect = new LibSQLDialect({
			client: createClient({
				url,
				...(isRemoteLibsql
					? {
							authToken: Redacted.value(
								yield* Config.redacted('DATABASE_TOKEN').pipe(
									Effect.orElseSucceed(() => Redacted.make('')),
								),
							),
						}
					: {}),
			}),
		})
		const kysely = new Kysely<KyselyDatabase>({ dialect })

		// Create tables if they don't exist via Kysely schema builder
		yield* Effect.tryPromise(async () => {
			await kysely.schema
				.createTable('documents')
				.ifNotExists()
				.addColumn('id', 'text', col => col.primaryKey().notNull())
				.addColumn('snapshot', 'blob', col => col.notNull())
				.execute()

			await kysely.schema
				.createTable('document_history')
				.ifNotExists()
				.addColumn('doc_id', 'text', col => col.notNull())
				.addColumn('version_id', 'text', col => col.notNull())
				.addColumn('version', 'text', col => col.notNull())
				.addColumn('timestamp', 'integer', col => col.notNull())
				.addColumn('author', 'text', col => col.notNull())
				.addColumn('message', 'text')
				.addPrimaryKeyConstraint('document_history_pk', [
					'doc_id',
					'version_id',
				])
				.execute()

			await kysely.schema
				.createTable('diagrams')
				.ifNotExists()
				.addColumn('id', 'text', col => col.primaryKey().notNull())
				.addColumn('snapshot', 'blob', col => col.notNull())
				.execute()

			await kysely.schema
				.createTable('diagram_history')
				.ifNotExists()
				.addColumn('diag_id', 'text', col => col.notNull())
				.addColumn('version_id', 'text', col => col.notNull())
				.addColumn('version', 'text', col => col.notNull())
				.addColumn('timestamp', 'integer', col => col.notNull())
				.addColumn('author', 'text', col => col.notNull())
				.addColumn('message', 'text')
				.addPrimaryKeyConstraint('diagram_history_pk', [
					'diag_id',
					'version_id',
				])
				.execute()
		})

		const execute = (sql: string, params: any[] = []) =>
			Effect.tryPromise({
				try: () => client.execute(sql, params),
				catch: _ => {
					return new ErrorDbExecutionFailed({
						message: 'Database operation failed',
					})
				},
			})

		const batch = (statements: string[]) =>
			Effect.tryPromise(() => client.batch(statements))

		return {
			execute,
			batch,
			client,
			kysely,
		} as const
	}),
}) {}
