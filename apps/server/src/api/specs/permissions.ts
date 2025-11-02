import { HttpApiEndpoint, HttpApiError, HttpApiGroup } from '@effect/platform'
import { Schema } from 'effect'

import { SessionSpec } from '~services'
import { OrganizationId } from './organizations.js'

const CollaborationResourceType = Schema.Literal(
	'organization',
	'workspace',
	'folder',
	'doc',
	'file',
	'group',
)

const CollaborationRole = Schema.Literal(
	'owner',
	'editor',
	'viewer',
	'external_editor',
	'external_viewer',
)

export const Collaboration = Schema.Struct({
	id: Schema.String,
	resourceId: Schema.String,
	resourceType: CollaborationResourceType,
	accessibleBy: Schema.Struct({
		type: Schema.Literal('user', 'email'),
		reference: Schema.String,
	}),
	role: CollaborationRole,
	createdAt: Schema.String,
	createdBy: Schema.String,
})

const CollaborationPath = Schema.Struct({
	orgId: OrganizationId,
})

const SingleCollaborationPath = Schema.Struct({
	orgId: OrganizationId,
	collabId: Schema.String,
})

const ResourceCollaborationsPath = Schema.Struct({
	orgId: OrganizationId,
	resourceType: CollaborationResourceType,
	resourceId: Schema.String,
})

const CreateCollaborationBody = Schema.Struct({
	resourceType: CollaborationResourceType,
	resourceId: Schema.String,
	accessibleBy: Schema.Struct({
		type: Schema.Literal('user', 'email'),
		reference: Schema.String,
	}),
	role: CollaborationRole,
})

const UpdateCollaborationBody = Schema.Struct({
	role: CollaborationRole,
})

const Exemption = Schema.Struct({
	id: Schema.String,
	subject: Schema.String,
	createdAt: Schema.String,
	createdBy: Schema.String,
	reason: Schema.optional(Schema.String),
})

const ExemptionsPath = Schema.Struct({
	orgId: OrganizationId,
})

const CreateExemptionBody = Schema.Struct({
	subject: Schema.String,
	reason: Schema.optional(Schema.String),
})

export class GroupPermissionsSpec extends HttpApiGroup.make('Permissions')
	.add(
		HttpApiEndpoint.post(
			'createCollaboration',
			'/organizations/{orgId}/collaborations',
		)
			.setUrlParams(CollaborationPath)
			.setPayload(CreateCollaborationBody)
			.addSuccess(Collaboration)
			.addError(HttpApiError.BadRequest)
			.addError(HttpApiError.Unauthorized)
			.addError(HttpApiError.Forbidden)
			.middleware(SessionSpec),
	)
	.add(
		HttpApiEndpoint.get(
			'listResourceCollaborations',
			'/organizations/{orgId}/{resourceType}/{resourceId}/collaborations',
		)
			.setUrlParams(ResourceCollaborationsPath)
			.addSuccess(Schema.Array(Collaboration))
			.addError(HttpApiError.Unauthorized)
			.addError(HttpApiError.Forbidden)
			.middleware(SessionSpec),
	)
	.add(
		HttpApiEndpoint.patch(
			'updateCollaboration',
			'/organizations/{orgId}/collaborations/{collabId}',
		)
			.setUrlParams(SingleCollaborationPath)
			.setPayload(UpdateCollaborationBody)
			.addSuccess(Collaboration)
			.addError(HttpApiError.BadRequest)
			.addError(HttpApiError.NotFound)
			.addError(HttpApiError.Unauthorized)
			.addError(HttpApiError.Forbidden)
			.middleware(SessionSpec),
	)
	.add(
		HttpApiEndpoint.del(
			'deleteCollaboration',
			'/organizations/{orgId}/collaborations/{collabId}',
		)
			.setUrlParams(SingleCollaborationPath)
			.addSuccess(Schema.Struct({ deleted: Schema.Boolean }))
			.addError(HttpApiError.NotFound)
			.addError(HttpApiError.Unauthorized)
			.addError(HttpApiError.Forbidden)
			.middleware(SessionSpec),
	)
	.add(
		HttpApiEndpoint.post('createExemption', '/organizations/{orgId}/exemptions')
			.setUrlParams(ExemptionsPath)
			.setPayload(CreateExemptionBody)
			.addSuccess(Exemption)
			.addError(HttpApiError.BadRequest)
			.addError(HttpApiError.Unauthorized)
			.addError(HttpApiError.Forbidden)
			.middleware(SessionSpec),
	)
	.add(
		HttpApiEndpoint.get('listExemptions', '/organizations/{orgId}/exemptions')
			.setUrlParams(ExemptionsPath)
			.addSuccess(Schema.Array(Exemption))
			.addError(HttpApiError.Unauthorized)
			.addError(HttpApiError.Forbidden)
			.middleware(SessionSpec),
	) {}
