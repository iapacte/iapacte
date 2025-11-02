import { HttpApiEndpoint, HttpApiGroup } from '@effect/platform'
import { Schema } from 'effect'

export const HealthResponse = Schema.Struct({
  message: Schema.Literal('OK'),
})

export const HealthApi = HttpApiEndpoint.get('health', '/health').addSuccess(
  HealthResponse,
)

export class GroupHealthSpec extends HttpApiGroup.make('Health').add(
  HealthApi,
) {}

