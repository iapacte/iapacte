import { Buffer } from 'node:buffer'
import type { IncomingMessage } from 'node:http'
import {
	HttpApiBuilder,
	HttpServerRequest,
	HttpServerResponse,
} from '@effect/platform'
import { Effect } from 'effect'

import { BetterAuth } from '~services'
import { BetterAuthApiSpec } from '../specs/better-auth.js'

const forwardBetterAuth = () =>
	Effect.gen(function* () {
		const request = yield* HttpServerRequest.HttpServerRequest
		const betterAuth = yield* BetterAuth

		const fetchRequest = yield* Effect.promise(() =>
			toFetchRequest(request.source),
		)
		const response = yield* betterAuth.call(client =>
			client.handler(fetchRequest),
		)

		const headers = cloneHeaders(response.headers)

		return yield* HttpServerResponse.raw(response.body ?? null, {
			status: response.status,
			statusText: response.statusText,
			headers,
		})
	}).pipe(Effect.orDie)

export const BetterAuthApiLive = HttpApiBuilder.group(
	BetterAuthApiSpec,
	'BetterAuth',
	handlers =>
		handlers
			.handleRaw('betterAuthGet', forwardBetterAuth)
			.handleRaw('betterAuthPost', forwardBetterAuth)
			.handleRaw('betterAuthPut', forwardBetterAuth)
			.handleRaw('betterAuthPatch', forwardBetterAuth)
			.handleRaw('betterAuthDelete', forwardBetterAuth)
			.handleRaw('betterAuthOptions', forwardBetterAuth),
)

async function toFetchRequest(source: unknown): Promise<Request> {
	if (source instanceof Request) {
		return source
	}

	const incoming = source as IncomingMessage
	const method = incoming.method ?? 'GET'
	const protoHeader = incoming.headers['x-forwarded-proto']
	const protocol = Array.isArray(protoHeader)
		? protoHeader[0]
		: typeof protoHeader === 'string'
			? protoHeader
			: 'http'
	const host = incoming.headers.host ?? 'localhost'
	const url = new URL(incoming.url ?? '/', `${protocol}://${host}`)

	const headers = new Headers()
	for (const [key, value] of Object.entries(incoming.headers)) {
		if (value === undefined) continue
		if (Array.isArray(value)) {
			value.forEach(entry => headers.append(key, entry))
		} else {
			headers.append(key, value)
		}
	}

	let body: BodyInit | undefined
	if (method !== 'GET' && method !== 'HEAD') {
		const chunks: Buffer[] = []
		for await (const chunk of incoming) {
			chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
		}
		if (chunks.length > 0) {
			body = Buffer.concat(chunks)
		}
	}

	return new Request(url, {
		method,
		headers,
		body,
	})
}

function cloneHeaders(headers: Headers): HeadersInit {
	const raw = (
		headers as unknown as { raw?: () => Record<string, string[]> }
	).raw?.()

	if (raw) {
		const result: Record<string, string | string[]> = {}
		for (const [key, values] of Object.entries(raw)) {
			result[key] = values.length > 1 ? values : values[0]
		}
		return result
	}

	const result: Record<string, string> = {}
	headers.forEach((value, key) => {
		result[key] = value
	})
	return result
}
