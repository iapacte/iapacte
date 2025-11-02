import { ManagedRuntime } from 'effect'

import { FileService } from './files.js'

const MainLayer = FileService.Live

export const RuntimeClient = ManagedRuntime.make(MainLayer)

export {
	type Authorization,
	AuthorizationService,
} from './authorization_service.js'
export * from './authz_errors.js'
export * from './authz_types.js'
export {
	BetterAuth,
	BetterAuthError,
	type BetterAuthSession,
} from './better_auth.js'
export { Database } from './database.js'
export * from './files.js'
export { type OpenFGA, OpenFGAClient } from './openfga_client.js'
export {
	AuthenticatedSession,
	SessionLive,
	SessionSpec,
} from './session.js'
export { WorkspaceStore } from './workspace_store.js'
