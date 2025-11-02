import { HttpApiEndpoint, HttpApiError, HttpApiGroup } from '@effect/platform'
import { Schema } from 'effect'

import { SessionSpec } from '~services'

export const OrganizationId = Schema.String

export const OrganizationSummary = Schema.Struct({
	id: OrganizationId,
	name: Schema.String,
	region: Schema.optional(Schema.String),
	createdAt: Schema.String,
	updatedAt: Schema.String,
})

export const OrganizationDetails = OrganizationSummary.pipe(
	Schema.extend(
		Schema.Struct({
			metadata: Schema.optional(Schema.Unknown),
		}),
	),
)

export const CreateOrganizationBody = Schema.Struct({
	name: Schema.String,
	region: Schema.optional(Schema.String),
	metadata: Schema.optional(Schema.Unknown),
})

export const UpdateOrganizationBody = Schema.Struct({
	name: Schema.optional(Schema.String),
	region: Schema.optional(Schema.String),
	metadata: Schema.optional(Schema.Unknown),
})

export class GroupOrganizationsSpec extends HttpApiGroup.make('Organizations')
	.add(
		HttpApiEndpoint.get('listOrganizations', '/organizations')
			.addSuccess(Schema.Array(OrganizationSummary))
			.addError(HttpApiError.Unauthorized)
			.middleware(SessionSpec),
	)
	.add(
		HttpApiEndpoint.post('createOrganization', '/organizations')
			.setPayload(CreateOrganizationBody)
			.addSuccess(OrganizationDetails)
			.addError(HttpApiError.BadRequest)
			.addError(HttpApiError.Unauthorized)
			.middleware(SessionSpec),
	)
	.add(
		HttpApiEndpoint.get('getOrganization', '/organizations/{orgId}')
			.setUrlParams(Schema.Struct({ orgId: OrganizationId }))
			.addSuccess(OrganizationDetails)
			.addError(HttpApiError.NotFound)
			.addError(HttpApiError.Unauthorized)
			.middleware(SessionSpec),
	)
	.add(
		HttpApiEndpoint.patch('updateOrganization', '/organizations/{orgId}')
			.setUrlParams(Schema.Struct({ orgId: OrganizationId }))
			.setPayload(UpdateOrganizationBody)
			.addSuccess(OrganizationDetails)
			.addError(HttpApiError.BadRequest)
			.addError(HttpApiError.NotFound)
			.addError(HttpApiError.Unauthorized)
			.middleware(SessionSpec),
	)
	.add(
		HttpApiEndpoint.del('deleteOrganization', '/organizations/{orgId}')
			.setUrlParams(Schema.Struct({ orgId: OrganizationId }))
			.addSuccess(Schema.Struct({ deleted: Schema.Boolean }))
			.addError(HttpApiError.NotFound)
			.addError(HttpApiError.Unauthorized)
			.middleware(SessionSpec),
	) {}
