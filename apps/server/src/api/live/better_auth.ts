import type { IncomingMessage } from 'node:http'
import type { Socket } from 'node:net'
import type { TLSSocket } from 'node:tls'
import {
	HttpApiBuilder,
	HttpServerRequest,
	HttpServerResponse,
} from '@effect/platform'
import * as NodeHttpServerRequest from '@effect/platform-node/NodeHttpServerRequest'
import { getRequest } from 'better-call/node'
import { Effect } from 'effect'

import { Auth } from '~lib'
import { BetterAuthError, betterAuthStatusFromError } from '~services'
import { BetterAuthApiSpec } from '../specs/better-auth.js'

const forwardBetterAuth = () =>
	Effect.gen(function* () {
		const request = yield* HttpServerRequest.HttpServerRequest
		const auth = yield* Auth

		const nodeReq = NodeHttpServerRequest.toIncomingMessage(request)
		const fetchRequest = getRequest({
			request: nodeReq,
			base: resolveBaseUrl(nodeReq),
		})

		const authResponse = yield* Effect.tryPromise({
			try: () => auth.instance.handler(fetchRequest),
			catch: error => new BetterAuthError({ error }),
		})

		const body = yield* Effect.tryPromise({
			try: () => authResponse.arrayBuffer(),
			catch: error => new BetterAuthError({ error }),
		})

		const headers = toHeadersInput(authResponse.headers)
		const contentType = extractContentType(headers)
		delete headers['content-length']

		return HttpServerResponse.uint8Array(new Uint8Array(body), {
			status: authResponse.status,
			statusText: authResponse.statusText,
			headers,
			contentType,
		})
	}).pipe(
		Effect.catchTag('BetterAuthError', (error: BetterAuthError) => {
			const status = betterAuthStatusFromError(error.error)
			const body =
				status >= 500
					? { error: 'Internal server error' }
					: { error: 'Request failed' }

			return Effect.logError('BetterAuth proxy failure', error.error).pipe(
				Effect.andThen(
					Effect.succeed(
						HttpServerResponse.unsafeJson(body, {
							status,
						}),
					),
				),
			)
		}),
		Effect.catchAll(() =>
			Effect.succeed(
				HttpServerResponse.unsafeJson(
					{ error: 'Internal server error' },
					{ status: 500 },
				),
			),
		),
	)

export const BetterAuthApiLive = HttpApiBuilder.group(
	BetterAuthApiSpec,
	'BetterAuth',
	handlers =>
		handlers
			.handle('betterAuthGet', forwardBetterAuth)
			.handle('betterAuthPost', forwardBetterAuth)
			.handle('betterAuthPut', forwardBetterAuth)
			.handle('betterAuthPatch', forwardBetterAuth)
			.handle('betterAuthDelete', forwardBetterAuth)
			.handle('betterAuthOptions', forwardBetterAuth),
)

const resolveBaseUrl = (request: IncomingMessage): string => {
	const forwardedProto = request.headers['x-forwarded-proto']
	const protocol =
		typeof forwardedProto === 'string'
			? (forwardedProto.split(',')[0]?.trim() ?? 'http')
			: isTlsSocket(request.socket)
				? 'https'
				: 'http'

	const host =
		(typeof request.headers[':authority'] === 'string'
			? request.headers[':authority']
			: undefined) ??
		(typeof request.headers.host === 'string'
			? request.headers.host
			: undefined) ??
		'localhost'

	return `${protocol}://${host}`
}

const toHeadersInput = (
	headers: globalThis.Headers,
): Record<string, string | ReadonlyArray<string>> => {
	const rawHeaders = (
		headers as unknown as {
			raw?: () => Record<string, ReadonlyArray<string>>
		}
	).raw?.()

	if (rawHeaders) {
		return Object.entries(rawHeaders).reduce<
			Record<string, string | ReadonlyArray<string>>
		>((acc, [key, values]) => {
			if (values.length === 0) {
				return acc
			}
			const first = values[0]!
			acc[key] = values.length === 1 ? first : values
			return acc
		}, {})
	}

	const fallback: Record<string, string | ReadonlyArray<string>> = {}
	headers.forEach((value, key) => {
		fallback[key] = value
	})
	return fallback
}

const extractContentType = (
	headers: Record<string, string | ReadonlyArray<string>>,
): string | undefined => {
	const contentType = headers['content-type']
	if (contentType === undefined) {
		return undefined
	}

	delete headers['content-type']

	if (typeof contentType === 'string') {
		return contentType
	}

	return contentType[0] ?? undefined
}

const isTlsSocket = (socket: Socket): socket is TLSSocket =>
	'encrypted' in socket && Boolean((socket as TLSSocket).encrypted)
