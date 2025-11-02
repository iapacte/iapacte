import { HttpApiBuilder } from '@effect/platform'
import { Effect } from 'effect'

import { GroupApiSpec } from '../specs/api.js'

export const GroupHealthLive = HttpApiBuilder.group(
  GroupApiSpec,
  'Health',
  handlers =>
    handlers.handle('health', () => Effect.succeed({ message: 'OK' })),
)

