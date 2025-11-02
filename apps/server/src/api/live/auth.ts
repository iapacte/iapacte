import { HttpApiBuilder, HttpApiError } from '@effect/platform'
import { Effect } from 'effect'

import type { PermissionAction, ResourceType } from '~services'
import { AuthenticatedSession, AuthorizationService } from '~services'
import { GroupApiSpec } from '../specs/api.js'
import { AuthorizeResponse } from '../specs/auth.js'

export const GroupAuthLive = HttpApiBuilder.group(
	GroupApiSpec,
	'Authorization',
	handlers =>
		handlers.handle('authorize', ({ urlParams }) =>
			Effect.gen(function* () {
				const { session } = yield* AuthenticatedSession
				const authz = yield* AuthorizationService

				const userId = session?.user?.id
				if (!userId) {
					return yield* Effect.fail(new HttpApiError.Unauthorized())
				}

				const resourceId =
					'resourceId' in urlParams && urlParams.resourceId
						? urlParams.resourceId
						: urlParams.organization

				const allowed = yield* authz.check({
					userId,
					action: urlParams.action as PermissionAction,
					resourceType: urlParams.resourceType as ResourceType,
					resourceId,
				})

				if (!allowed) {
					return yield* Effect.fail(new HttpApiError.Forbidden())
				}

				return new AuthorizeResponse({ authorized: true })
			}),
		),
)
