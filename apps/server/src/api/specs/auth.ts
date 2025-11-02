import {
	HttpApiEndpoint,
	HttpApiError,
	HttpApiGroup,
	OpenApi,
} from '@effect/platform'
import { Schema } from 'effect'

import { SessionSpec } from '~services'

const ResourceTypes = [
	'organization',
	'workspace',
	'folder',
	'doc',
	'file',
	'group',
] as const

export const ResourceType = Schema.Literal(...ResourceTypes)

export class AuthorizeByOrganization extends Schema.Class<AuthorizeByOrganization>(
	'AuthorizeByOrganization',
)({
	action: Schema.String,
	resourceType: ResourceType,
	organization: Schema.String,
	resourceId: Schema.optional(Schema.String),
}) {}

export class AuthorizeByResource extends Schema.Class<AuthorizeByResource>(
	'AuthorizeByResource',
)({
	action: Schema.String,
	resourceType: ResourceType,
	resourceId: Schema.String,
	organization: Schema.optional(Schema.String),
}) {}

export const AuthorizeRequest = Schema.Union(
	AuthorizeByOrganization,
	AuthorizeByResource,
)

export class AuthorizeResponse extends Schema.Class<AuthorizeResponse>(
	'AuthorizeResponse',
)({
	authorized: Schema.Boolean,
}) {}

export class GroupAuthSpec extends HttpApiGroup.make('Authorization')
	.add(
		HttpApiEndpoint.get('authorize', '/authorize')
			.setUrlParams(AuthorizeRequest)
			.addSuccess(AuthorizeResponse)
			.addError(HttpApiError.BadRequest)
			.addError(HttpApiError.Unauthorized)
			.addError(HttpApiError.Forbidden)
			.addError(HttpApiError.InternalServerError)
			.middleware(SessionSpec),
	)
	.annotate(OpenApi.Description, 'Authorization endpoints backed by OpenFGA') {}
