import { createClient } from '@libsql/client'
import { betterAuth } from 'better-auth'
import { LibSQLDialect } from 'kysely-turso/libsql'

// Validate environment variables first
if (process.env.DATABASE_AUTH_URL === undefined)
	throw new Error('DATABASE_AUTH_URL is not set')

if (process.env.DATABASE_AUTH_SECRET === undefined)
	throw new Error('DATABASE_AUTH_SECRET is not set')

if (process.env.BETTER_AUTH_SECRET === undefined)
	throw new Error('BETTER_AUTH_SECRET is not set')

const betterAuthBaseURL = process.env.BETTER_AUTH_BASE_URL
const betterAuthCookieDomain = process.env.BETTER_AUTH_COOKIE_DOMAIN

const isProduction = process.env.NODE_ENV === 'production'
// In local Docker, we serve over HTTP. Secure cookies would be ignored by browsers on HTTP.
// Allow overriding cookie security explicitly for such environments.
const insecureCookiesOverride = process.env.BETTER_AUTH_INSECURE_COOKIES === 'true'
// If a base URL is configured, infer security from protocol; otherwise fall back to NODE_ENV.
const inferredSecure = betterAuthBaseURL
	? betterAuthBaseURL.startsWith('https://')
	: isProduction
const crossSubDomainCookiesEnabled =
	isProduction && betterAuthCookieDomain !== undefined

if (crossSubDomainCookiesEnabled && betterAuthBaseURL === undefined)
	throw new Error(
		'BETTER_AUTH_BASE_URL is required when BETTER_AUTH_COOKIE_DOMAIN is set',
	)

// Now we can safely create the config with guaranteed non-undefined values
const dialectConfig = {
	url: process.env.DATABASE_AUTH_URL,
	authToken: process.env.DATABASE_AUTH_SECRET,
} as const

export const auth = betterAuth({
	basePath: '/auth',
	baseURL: betterAuthBaseURL ?? '', // Fix: enforce string (never undefined)
	secret: process.env.BETTER_AUTH_SECRET ?? '', // Extra safety
	database: {
		dialect: new LibSQLDialect({
			client: createClient(dialectConfig),
		}),
		type: 'sqlite',
	},

	// Email and password authentication
	emailAndPassword: {
		enabled: true,
		autoSignIn: true, // Automatically sign in after registration
	},

	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		cookieCache: {
			enabled: true,
			maxAge: 60 * 5, // 5 minutes
		},
	},

	// Add trusted origins for CORS (development only, production uses same domain)
	trustedOrigins:
		process.env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()) ?? [],

	// Advanced cookie and security settings
	advanced: {
		cookiePrefix: 'better_auth',
		// Enable subdomain cookies in production (api.aipacto.com → .aipacto.com)
		...(crossSubDomainCookiesEnabled
			? {
					crossSubDomainCookies: {
						enabled: true,
						domain: betterAuthCookieDomain ?? '',
					},
				}
			: {}),
		// Use secure cookies in production (HTTPS only)
    useSecureCookies: insecureCookiesOverride ? false : inferredSecure,
		ipAddress: {
			ipAddressHeaders: ['x-client-ip', 'x-forwarded-for', 'cf-connecting-ip'],
			disableIpTracking: false,
		},
	},
}) as ReturnType<typeof betterAuth>
