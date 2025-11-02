export const PermissionActions = [
	'read',
	'write',
	'delete',
	'share',
	'change_owner',
] as const

export type PermissionAction = (typeof PermissionActions)[number]

export const PermissionLevels = [
	'owner',
	'editor',
	'commenter',
	'viewer',
] as const

export type PermissionLevel = (typeof PermissionLevels)[number]

export const ResourceTypes = [
	'organization',
	'workspace',
	'folder',
	'doc',
	'file',
	'group',
] as const

export type ResourceType = (typeof ResourceTypes)[number]
