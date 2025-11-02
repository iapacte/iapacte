import { HttpApiBuilder } from '@effect/platform'
import { Layer } from 'effect'

import { GroupApiSpec } from '../specs/api.js'
import { GroupAuthLive } from './auth.js'
import { GroupHealthLive } from './health.js'
import { GroupOrganizationsLive } from './organizations.js'
import { GroupPermissionsLive } from './permissions.js'
import { GroupUsersLive } from './users.js'

export const GroupApiLive = HttpApiBuilder.api(GroupApiSpec).pipe(
  Layer.provide(GroupHealthLive),
  Layer.provide(GroupAuthLive),
  Layer.provide(GroupOrganizationsLive),
  Layer.provide(GroupUsersLive),
  Layer.provide(GroupPermissionsLive),
)

