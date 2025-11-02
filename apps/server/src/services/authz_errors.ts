import { Data } from 'effect'

export class OpenFGAError extends Data.TaggedError('OpenFGAError')<{
	readonly operation: string
	readonly error: unknown
}> {}

export class AuthorizationCheckError extends Data.TaggedError(
	'AuthorizationCheckError',
)<{
	readonly message: string
	readonly userId: string
	readonly action: string
	readonly resource: string
}> {}
