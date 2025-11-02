import { HttpApi, HttpApiEndpoint, HttpApiGroup } from '@effect/platform'

export class GroupBetterAuthSpec extends HttpApiGroup.make('BetterAuth')
  .add(HttpApiEndpoint.get('betterAuthGet', '/auth/*'))
  .add(HttpApiEndpoint.post('betterAuthPost', '/auth/*'))
  .add(HttpApiEndpoint.put('betterAuthPut', '/auth/*'))
  .add(HttpApiEndpoint.patch('betterAuthPatch', '/auth/*'))
  .add(HttpApiEndpoint.delete('betterAuthDelete', '/auth/*'))
  .add(HttpApiEndpoint.options('betterAuthOptions', '/auth/*')) {}

export const BetterAuthApiSpec = HttpApi.make('BetterAuthApi').add(
  GroupBetterAuthSpec,
)

