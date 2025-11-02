import { HttpApiEndpoint, HttpApiError, HttpApiGroup } from '@effect/platform'
import { Schema } from 'effect'

import { SessionSpec } from '~services'
import { OrganizationId } from './organizations.js'

export const OrganizationUserId = Schema.String

export const OrganizationUser = Schema.Struct({
	id: OrganizationUserId,
	email: Schema.String,
	role: Schema.String,
	status: Schema.Literal('active', 'pending'),
	invitedAt: Schema.optional(Schema.String),
	joinedAt: Schema.optional(Schema.String),
})

export const CreateUserBody = Schema.Struct({
	email: Schema.String,
	role: Schema.String,
	displayName: Schema.optional(Schema.String),
})

export const UpdateUserBody = Schema.Struct({
	role: Schema.optional(Schema.String),
	displayName: Schema.optional(Schema.String),
	status: Schema.optional(Schema.Literal('active', 'pending')),
})

const OrganizationPathParams = Schema.Struct({
	orgId: OrganizationId,
})

const OrganizationUserPathParams = Schema.Struct({
	orgId: OrganizationId,
	userId: OrganizationUserId,
})

export class GroupUsersSpec extends HttpApiGroup.make('Users')
	.prefix('/organizations/{orgId}')
	.add(
		HttpApiEndpoint.get('listUsers', '/users')
			.setUrlParams(OrganizationPathParams)
			.addSuccess(Schema.Array(OrganizationUser))
			.addError(HttpApiError.Unauthorized)
			.addError(HttpApiError.Forbidden)
			.middleware(SessionSpec),
	)
	.add(
		HttpApiEndpoint.post('inviteUser', '/users')
			.setUrlParams(OrganizationPathParams)
			.setPayload(CreateUserBody)
			.addSuccess(OrganizationUser)
			.addError(HttpApiError.BadRequest)
			.addError(HttpApiError.Unauthorized)
			.addError(HttpApiError.Forbidden)
			.middleware(SessionSpec),
	)
	.add(
		HttpApiEndpoint.get('getUser', '/users/{userId}')
			.setUrlParams(OrganizationUserPathParams)
			.addSuccess(OrganizationUser)
			.addError(HttpApiError.NotFound)
			.addError(HttpApiError.Unauthorized)
			.addError(HttpApiError.Forbidden)
			.middleware(SessionSpec),
	)
	.add(
		HttpApiEndpoint.patch('updateUser', '/users/{userId}')
			.setUrlParams(OrganizationUserPathParams)
			.setPayload(UpdateUserBody)
			.addSuccess(OrganizationUser)
			.addError(HttpApiError.BadRequest)
			.addError(HttpApiError.NotFound)
			.addError(HttpApiError.Unauthorized)
			.addError(HttpApiError.Forbidden)
			.middleware(SessionSpec),
	)
	.add(
		HttpApiEndpoint.del('removeUser', '/users/{userId}')
			.setUrlParams(OrganizationUserPathParams)
			.addSuccess(Schema.Struct({ removed: Schema.Boolean }))
			.addError(HttpApiError.NotFound)
			.addError(HttpApiError.Unauthorized)
			.addError(HttpApiError.Forbidden)
			.middleware(SessionSpec),
	) {}
