import {
  HttpApiError,
  HttpApiMiddleware,
  HttpApiSecurity,
  HttpServerRequest,
} from '@effect/platform'
import { Context, Effect, Layer, Redacted, Schema } from 'effect'

import type { BetterAuthSession } from './better_auth.js'
import { BetterAuth } from './better_auth.js'

export class AuthenticatedSession extends Context.Tag(
  'AuthenticatedSession',
)<
  AuthenticatedSession,
  {
    readonly session: BetterAuthSession
  }
>() {}

export class SessionSpec extends HttpApiMiddleware.Tag<SessionSpec>()(
  'BetterAuthSession',
  {
    provides: AuthenticatedSession,
    failure: Schema.Union(
      HttpApiError.BadRequest,
      HttpApiError.Unauthorized,
      HttpApiError.InternalServerError,
    ),
    security: {
      bearer: HttpApiSecurity.bearer,
    },
  },
) {}

export const SessionLive = Layer.effect(
  SessionSpec,
  Effect.gen(function* () {
    const betterAuth = yield* BetterAuth

    return {
      bearer: (_token: Redacted.Redacted<string>) =>
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest

          const headers = extractHeaders(request)

          const session = yield* betterAuth
            .call((client, signal) =>
              client.api.getSession({
                headers,
                signal,
              }),
            )
            .pipe(
              Effect.catchTag('BetterAuthError', error =>
                Effect.logError('BetterAuth session failure', error.error).pipe(
                  Effect.andThen(Effect.fail(new HttpApiError.Unauthorized())),
                ),
              ),
            )

          if (!session) {
            return yield* Effect.fail(new HttpApiError.Unauthorized())
          }

          return { session }
        }).pipe(
          Effect.tap(() =>
            Effect.logDebug('Session validated via Better Auth middleware'),
          ),
          Effect.catchAll(() => Effect.fail(new HttpApiError.Unauthorized())),
        ),
    }
  }),
)

function extractHeaders(request: HttpServerRequest.HttpServerRequest): Headers {
  const headers = new Headers()

  const copyIntoHeaders = (sourceHeaders: Headers | Iterable<[string, string]>) => {
    if ('forEach' in sourceHeaders && typeof sourceHeaders.forEach === 'function') {
      sourceHeaders.forEach((value, key) => {
        headers.append(key, value)
      })
    } else {
      for (const [key, value] of sourceHeaders as Iterable<[string, string]>) {
        headers.append(key, value)
      }
    }
  }

  if (request.headers && typeof (request.headers as Headers).forEach === 'function') {
    copyIntoHeaders(request.headers as Headers)
    return headers
  }

  const source = request.source

  if (source instanceof Request) {
    copyIntoHeaders(source.headers)
    return headers
  }

  const possibleHeaders = (source as { headers?: unknown })?.headers
  if (possibleHeaders) {
    if (possibleHeaders instanceof Headers) {
      copyIntoHeaders(possibleHeaders)
      return headers
    }

    const recordHeaders = possibleHeaders as Record<string, string | string[]>
    for (const [key, value] of Object.entries(recordHeaders)) {
      if (Array.isArray(value)) {
        value.forEach(v => headers.append(key, v))
      } else {
        headers.append(key, value)
      }
    }
    return headers
  }

  return headers
}

