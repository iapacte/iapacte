import { HttpApi, OpenApi } from '@effect/platform'

import { GroupAuthSpec } from './auth.js'
import { GroupHealthSpec } from './health.js'
import { GroupOrganizationsSpec } from './organizations.js'
import { GroupUsersSpec } from './users.js'

export const GroupApiSpec = HttpApi.make('Api')
	.add(GroupHealthSpec)
	.add(GroupAuthSpec)
	.add(GroupOrganizationsSpec)
	.add(GroupUsersSpec)
	// .add(GroupPermissionsSpec)
	.annotate(OpenApi.Title, 'Iapacte Server API')
	.annotate(OpenApi.Version, '1')
	.prefix('/api/v1')
