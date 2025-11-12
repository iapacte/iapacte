import { HttpApiBuilder, HttpApiError } from '@effect/platform'
import { Effect } from 'effect'

/**
 * TODO(authz): Restore these types when authorization checks return.
 */
// import type { PermissionAction, ResourceType } from '~services'
import {
	AuthenticatedSession,
	// AuthorizationService,
} from '~services'
import { GroupApiSpec } from '../specs/api.js'
import { AuthorizeResponse } from '../specs/auth.js'

export const GroupAuthLive = HttpApiBuilder.group(
	GroupApiSpec,
	'Authorization',
	handlers =>
		handlers.handle('authorize', ({ urlParams }) =>
			Effect.gen(function* () {
				// const user = yield* AuthenticatedSession
				yield* AuthenticatedSession
				// const authz = yield* AuthorizationService

				const resourceId =
					'resourceId' in urlParams && urlParams.resourceId
						? urlParams.resourceId
						: urlParams.organization

				if (!resourceId) {
					return yield* Effect.fail(new HttpApiError.BadRequest())
				}

				// TODO(authz): Enforce authorization when authz is ready.
				// const allowed = yield* authz
				// 	.check({
				// 		userId: user.userId,
				// 		action: urlParams.action as PermissionAction,
				// 		resourceType: urlParams.resourceType as ResourceType,
				// 		resourceId,
				// 	})
				// 	.pipe(
				// 		Effect.catchTag('OpenFGAError', _error =>
				// 			Effect.fail(new HttpApiError.InternalServerError()),
				// 		),
				// 	)
				// if (!allowed) {
				// 	return yield* Effect.fail(new HttpApiError.Forbidden())
				// }

				return new AuthorizeResponse({ authorized: true })
			}),
		),
)
