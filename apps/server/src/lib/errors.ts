import { HttpApiSchema } from '@effect/platform'
import { Schema } from 'effect'

export class Unauthorized extends Schema.TaggedError<Unauthorized>()(
	'Unauthorized',
	{
		message: Schema.String,
	},
	HttpApiSchema.annotations({ status: 401 }),
) {}

export class Forbidden extends Schema.TaggedError<Forbidden>()(
	'Forbidden',
	{
		message: Schema.String,
	},
	HttpApiSchema.annotations({ status: 403 }),
) {}

export class NotFound extends Schema.TaggedError<NotFound>()(
	'NotFound',
	{
		message: Schema.String,
	},
	HttpApiSchema.annotations({ status: 404 }),
) {}

export class BadRequest extends Schema.TaggedError<BadRequest>()(
	'BadRequest',
	{
		message: Schema.String,
	},
	HttpApiSchema.annotations({ status: 400 }),
) {}

export class InternalServerError extends Schema.TaggedError<InternalServerError>()(
	'InternalServerError',
	{
		message: Schema.String,
	},
	HttpApiSchema.annotations({ status: 500 }),
) {}
